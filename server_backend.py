"\"\"\"
OU Exams Pulse — Backend
- Scrapes Osmania University press notes every 10 minutes.
- Stores notifications in MongoDB.
- Allows students to subscribe to courses of interest.
- Maintains a MOCK WhatsApp outbound queue (not actually sending).
- Exposes admin endpoints for inspection.
\"\"\"
import logging
import os
import re
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from dotenv import load_dotenv
from fastapi import APIRouter, FastAPI, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, ConfigDict, field_validator
from starlette.middleware.cors import CORSMiddleware

from scraper import scrape_press_notes

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / \".env\")

logging.basicConfig(
    level=logging.INFO,
    format=\"%(asctime)s - %(name)s - %(levelname)s - %(message)s\",
)
logger = logging.getLogger(\"ouexams\")

# ---------- DB ----------
mongo_url = os.environ[\"MONGO_URL\"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ[\"DB_NAME\"]]

NOTES = db.notifications
SUBS = db.subscribers
LOGS = db.scrape_logs
QUEUE = db.wa_queue

# ---------- Scheduler ----------
scheduler = AsyncIOScheduler()
SCRAPE_INTERVAL_MIN = int(os.environ.get(\"SCRAPE_INTERVAL_MIN\", \"10\"))


# ---------- Models ----------
class Notification(BaseModel):
    model_config = ConfigDict(extra=\"ignore\")
    id: str
    title: str
    date: str
    date_raw: str
    source_url: str
    courses: List[str]
    category: str
    scraped_at: str
    first_seen_at: Optional[str] = None


class SubscribeRequest(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    phone: str = Field(min_length=8, max_length=20)
    courses: List[str] = Field(min_length=1)

    @field_validator(\"phone\")
    @classmethod
    def _norm_phone(cls, v: str) -> str:
        v = re.sub(r\"[^\d+]\", \"\", v.strip())
        if not v:
            raise ValueError(\"Invalid phone\")
        return v


class Subscriber(BaseModel):
    model_config = ConfigDict(extra=\"ignore\")
    id: str
    name: str
    phone: str
    courses: List[str]
    created_at: str
    active: bool = True


class ScrapeLog(BaseModel):
    model_config = ConfigDict(extra=\"ignore\")
    id: str
    started_at: str
    finished_at: Optional[str] = None
    status: str
    fetched: int = 0
    new_items: int = 0
    notifications_dispatched: int = 0
    error: Optional[str] = None


class QueueItem(BaseModel):
    model_config = ConfigDict(extra=\"ignore\")
    id: str
    subscriber_id: str
    subscriber_name: str
    phone: str
    notification_id: str
    title: str
    matched_course: str
    message: str
    status: str  # queued | sent (mocked)
    created_at: str


class StatsResponse(BaseModel):
    total_notifications: int
    total_subscribers: int
    total_queued: int
    total_sent: int
    last_scrape_at: Optional[str]
    next_scrape_at: Optional[str]


# ---------- Helpers ----------
async def _enqueue_for_subscribers(note: dict) -> int:
    \"\"\"Build mock WhatsApp messages for all subscribers whose courses match.\"\"\"
    note_courses = set(note.get(\"courses\", []))
    if not note_courses:
        return 0
    cursor = SUBS.find({\"active\": True, \"courses\": {\"$in\": list(note_courses)}}, {\"_id\": 0})
    dispatched = 0
    async for sub in cursor:
        matched = next((c for c in sub[\"courses\"] if c in note_courses), sub[\"courses\"][0])
        message = (
            f\"📢 OU Pulse Alert
\"
            f\"Hi {sub['name']}, a new update for *{matched}* was published:

\"
            f\"\\"{note['title']}\\"
\"
            f\"Dated: {note['date_raw']}
\"
            f\"Read: {note['source_url']}\"
        )
        item = {
            \"id\": f\"{note['id']}-{sub['id']}\",
            \"subscriber_id\": sub[\"id\"],
            \"subscriber_name\": sub[\"name\"],
            \"phone\": sub[\"phone\"],
            \"notification_id\": note[\"id\"],
            \"title\": note[\"title\"],
            \"matched_course\": matched,
            \"message\": message,
            \"status\": \"sent\",  # mocked — treat as immediately delivered
            \"created_at\": datetime.now(timezone.utc).isoformat(),
        }
        # Avoid duplicate enqueue
        await QUEUE.update_one({\"id\": item[\"id\"]}, {\"$setOnInsert\": item}, upsert=True)
        dispatched += 1
    return dispatched


async def run_scrape_job(triggered_by: str = \"scheduler\") -> dict:
    started = datetime.now(timezone.utc).isoformat()
    log_id = f\"log-{started}\"
    log = {
        \"id\": log_id,
        \"started_at\": started,
        \"finished_at\": None,
        \"status\": \"running\",
        \"fetched\": 0,
        \"new_items\": 0,
        \"notifications_dispatched\": 0,
        \"error\": None,
        \"triggered_by\": triggered_by,
    }
    await LOGS.insert_one(dict(log))
    try:
        notes = await _run_in_thread(scrape_press_notes)
        new_items = 0
        dispatched = 0
        for note in notes:
            existing = await NOTES.find_one({\"id\": note[\"id\"]}, {\"_id\": 0})
            if existing:
                # Keep first_seen_at preserved
                continue
            note[\"first_seen_at\"] = datetime.now(timezone.utc).isoformat()
            await NOTES.insert_one(dict(note))
            new_items += 1
            dispatched += await _enqueue_for_subscribers(note)
        finished = datetime.now(timezone.utc).isoformat()
        await LOGS.update_one(
            {\"id\": log_id},
            {\"$set\": {
                \"finished_at\": finished,
                \"status\": \"success\",
                \"fetched\": len(notes),
                \"new_items\": new_items,
                \"notifications_dispatched\": dispatched,
            }},
        )
        logger.info(\"Scrape ok: fetched=%d new=%d dispatched=%d\", len(notes), new_items, dispatched)
        return {\"fetched\": len(notes), \"new_items\": new_items, \"dispatched\": dispatched}
    except Exception as exc:  # noqa: BLE001
        logger.exception(\"Scrape failed\")
        await LOGS.update_one(
            {\"id\": log_id},
            {\"$set\": {
                \"finished_at\": datetime.now(timezone.utc).isoformat(),
                \"status\": \"error\",
                \"error\": str(exc),
            }},
        )
        return {\"error\": str(exc)}


async def _run_in_thread(fn):
    import asyncio
    return await asyncio.to_thread(fn)


# ---------- App ----------
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Index for fast queries
    await NOTES.create_index(\"id\", unique=True)
    await NOTES.create_index([(\"date\", -1)])
    await SUBS.create_index(\"id\", unique=True)
    await SUBS.create_index(\"phone\")
    await LOGS.create_index([(\"started_at\", -1)])
    await QUEUE.create_index([(\"created_at\", -1)])

    scheduler.add_job(run_scrape_job, \"interval\", minutes=SCRAPE_INTERVAL_MIN, id=\"scrape\", next_run_time=datetime.now(timezone.utc))
    scheduler.start()
    logger.info(\"Scheduler started — interval %d min\", SCRAPE_INTERVAL_MIN)
    yield
    scheduler.shutdown(wait=False)
    client.close()


app = FastAPI(lifespan=lifespan, title=\"OU Exams Pulse API\")
api = APIRouter(prefix=\"/api\")


@api.get(\"/\")
async def root():
    return {\"service\": \"OU Exams Pulse\", \"ok\": True}


@api.get(\"/health\")
async def health():
    return {\"status\": \"ok\", \"time\": datetime.now(timezone.utc).isoformat()}


# ---- Notifications ----
@api.get(\"/notifications\", response_model=List[Notification])
async def list_notifications(
    course: Optional[str] = Query(default=None),
    category: Optional[str] = Query(default=None),
    q: Optional[str] = Query(default=None),
    limit: int = Query(default=100, le=500),
):
    query: dict = {}
    if course and course != \"All\":
        query[\"courses\"] = course
    if category and category != \"All\":
        query[\"category\"] = category
    if q:
        query[\"title\"] = {\"$regex\": re.escape(q), \"$options\": \"i\"}
    cursor = NOTES.find(query, {\"_id\": 0}).sort([(\"date\", -1), (\"scraped_at\", -1)]).limit(limit)
    return [Notification(**doc) async for doc in cursor]


@api.get(\"/notifications/courses\")
async def known_courses():
    \"\"\"All distinct courses seen so far in scraped notifications.\"\"\"
    cursor = NOTES.distinct(\"courses\")
    items = await cursor if hasattr(cursor, \"__await__\") else cursor
    # motor's distinct returns coroutine
    courses = await NOTES.distinct(\"courses\")
    courses.sort()
    return {\"courses\": courses}


@api.post(\"/admin/scrape-now\")
async def trigger_scrape():
    return await run_scrape_job(triggered_by=\"manual\")


# ---- Subscribers ----
@api.post(\"/subscribe\", response_model=Subscriber)
async def subscribe(req: SubscribeRequest):
    sub_id = f\"sub-{req.phone}\"
    doc = {
        \"id\": sub_id,
        \"name\": req.name.strip(),
        \"phone\": req.phone,
        \"courses\": req.courses,
        \"created_at\": datetime.now(timezone.utc).isoformat(),
        \"active\": True,
    }
    await SUBS.update_one({\"id\": sub_id}, {\"$set\": doc}, upsert=True)
    return Subscriber(**doc)


@api.get(\"/admin/subscribers\", response_model=List[Subscriber])
async def list_subscribers():
    return [Subscriber(**d) async for d in SUBS.find({}, {\"_id\": 0}).sort(\"created_at\", -1)]


# ---- Scrape logs ----
@api.get(\"/admin/logs\", response_model=List[ScrapeLog])
async def list_logs(limit: int = 50):
    cursor = LOGS.find({}, {\"_id\": 0}).sort(\"started_at\", -1).limit(limit)
    return [ScrapeLog(**d) async for d in cursor]


# ---- WhatsApp queue (mocked) ----
@api.get(\"/admin/queue\", response_model=List[QueueItem])
async def list_queue(limit: int = 100):
    cursor = QUEUE.find({}, {\"_id\": 0}).sort(\"created_at\", -1).limit(limit)
    return [QueueItem(**d) async for d in cursor]


# ---- Stats ----
@api.get(\"/admin/stats\", response_model=StatsResponse)
async def stats():
    total_notes = await NOTES.count_documents({})
    total_subs = await SUBS.count_documents({\"active\": True})
    total_queued = await QUEUE.count_documents({\"status\": \"queued\"})
    total_sent = await QUEUE.count_documents({\"status\": \"sent\"})
    last_log = await LOGS.find_one({\"status\": \"success\"}, {\"_id\": 0}, sort=[(\"finished_at\", -1)])
    last_scrape = last_log[\"finished_at\"] if last_log else None
    next_run = None
    job = scheduler.get_job(\"scrape\")
    if job and job.next_run_time:
        next_run = job.next_run_time.astimezone(timezone.utc).isoformat()
    return StatsResponse(
        total_notifications=total_notes,
        total_subscribers=total_subs,
        total_queued=total_queued,
        total_sent=total_sent,
        last_scrape_at=last_scrape,
        next_scrape_at=next_run,
    )


app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get(\"CORS_ORIGINS\", \"*\").split(\",\"),
    allow_methods=[\"*\"],
    allow_headers=[\"*\"],
)
"
