"import { useEffect, useMemo, useState } from \"react\";
import { Search, RefreshCcw, Zap, Clock, ShieldCheck } from \"lucide-react\";
import NotificationsList from \"@/components/NotificationsList\";
import SubscribeForm from \"@/components/SubscribeForm\";
import { Input } from \"@/components/ui/input\";
import { Button } from \"@/components/ui/button\";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from \"@/components/ui/select\";
import { HOME } from \"@/constants/testIds\";
import { getNotifications, getCourses, getStats, triggerScrape } from \"@/lib/api\";
import { toast } from \"sonner\";

const CATEGORIES = [\"All\", \"Notification\", \"Timetable\", \"Results\", \"Update\"];

function timeAgo(iso) {
  if (!iso) return \"—\";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return \"just now\";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function Home() {
  const [items, setItems] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState(\"All\");
  const [category, setCategory] = useState(\"All\");
  const [q, setQ] = useState(\"\");
  const [stats, setStats] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [n, c, s] = await Promise.all([
        getNotifications({ course, category, q }),
        getCourses(),
        getStats(),
      ]);
      setItems(n);
      setCourses(c);
      setStats(s);
    } catch (err) {
      toast.error(\"Couldn't load feed\");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // poll fresh data periodically
    const id = setInterval(load, 60000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [course, category]);

  // Debounce search
  useEffect(() => {
    const id = setTimeout(load, 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const refresh = async () => {
    setRefreshing(true);
    try {
      const r = await triggerScrape();
      if (r?.new_items > 0) {
        toast.success(`${r.new_items} new notification(s) added`);
      } else {
        toast.info(\"Feed already up-to-date\");
      }
      await load();
    } catch (err) {
      toast.error(\"Refresh failed\");
    } finally {
      setRefreshing(false);
    }
  };

  const newest = useMemo(() => items.slice(0, 1)[0], [items]);

  return (
    <div>
      {/* HERO */}
      <section
        data-testid={HOME.hero}
        className=\"relative bg-grid border-b border-gray-200\"
      >
        <div className=\"max-w-7xl mx-auto px-6 md:px-10 pt-14 pb-16 md:pt-20 md:pb-24 grid md:grid-cols-12 gap-10 items-end\">
          <div className=\"md:col-span-7\">
            <div className=\"inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-[#8A1538] font-semibold\">
              <Zap size={12} /> Real-time · Osmania University
            </div>
            <h1 className=\"font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl tracking-tight mt-4 text-balance leading-[1.05]\">
              Be the <span className=\"text-[#8A1538]\">first</span> to know.
              <br />
              <span className=\"text-gray-400\">Every OU press note.</span>
            </h1>
            <p className=\"mt-5 text-base md:text-lg text-gray-600 max-w-xl leading-relaxed\">
              We watch{\" \"}
              <span className=\"font-mono text-[#8A1538]\">ouexams.in/press</span>{\" \"}
              around the clock and ping you on WhatsApp the second your exam
              timetable, result or revaluation update goes live.
            </p>
            <div className=\"mt-8 flex flex-wrap items-center gap-3\">
              <a
                href=\"#subscribe\"
                data-testid={HOME.subscribeBtn}
                className=\"inline-flex items-center gap-2 bg-[#8A1538] hover:bg-[#70112d] text-white px-5 py-3 rounded-md text-sm font-medium transition-colors\"
              >
                Get free WhatsApp alerts →
              </a>
              <a
                href=\"#feed\"
                className=\"inline-flex items-center gap-2 text-gray-700 hover:text-[#8A1538] text-sm transition-colors\"
              >
                Browse latest notes
              </a>
            </div>

            <div className=\"mt-10 grid grid-cols-3 gap-4 max-w-lg\">
              <Stat label=\"Notifications\" value={stats?.total_notifications ?? \"—\"} />
              <Stat label=\"Subscribers\" value={stats?.total_subscribers ?? \"—\"} />
              <Stat label=\"Alerts sent\" value={stats?.total_sent ?? \"—\"} />
            </div>
          </div>

          <div className=\"md:col-span-5\">
            <div className=\"border border-gray-200 bg-white p-5 shadow-crisp rounded-md\">
              <div
                data-testid={HOME.lastUpdated}
                className=\"flex items-center justify-between\"
              >
                <div className=\"flex items-center gap-2 text-xs text-gray-500\">
                  <span className=\"w-2 h-2 rounded-full bg-emerald-500 pulse-dot\" />
                  Live feed
                </div>
                <button
                  data-testid={HOME.refreshBtn}
                  onClick={refresh}
                  disabled={refreshing}
                  className=\"inline-flex items-center gap-1.5 text-xs text-gray-600 hover:text-[#8A1538] transition-colors\"
                >
                  <RefreshCcw size={13} className={refreshing ? \"animate-spin\" : \"\"} />
                  Refresh
                </button>
              </div>
              <div className=\"mt-3 text-[10px] uppercase tracking-[0.18em] text-gray-400\">
                Last scrape · {timeAgo(stats?.last_scrape_at)}
              </div>
              {newest ? (
                <div className=\"mt-4 border-t border-gray-100 pt-4\">
                  <div className=\"text-[10px] uppercase tracking-[0.18em] text-[#8A1538] font-bold flex items-center gap-1.5\">
                    <Clock size={12} /> Most recent
                  </div>
                  <a
                    href={newest.source_url}
                    target=\"_blank\"
                    rel=\"noreferrer noopener\"
                    className=\"block mt-2 font-medium text-sm leading-snug hover:text-[#8A1538] transition-colors\"
                  >
                    {newest.title}
                  </a>
                  <div className=\"mt-2 text-xs text-gray-500 font-mono\">
                    {newest.date_raw}
                  </div>
                </div>
              ) : (
                <div className=\"mt-4 h-16 bg-gray-50 rounded animate-pulse\" />
              )}
              <div className=\"mt-5 flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-gray-400\">
                <ShieldCheck size={12} /> Official source · ouexams.in
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEED */}
      <section id=\"feed\" className=\"max-w-7xl mx-auto px-6 md:px-10 py-12 md:py-16 grid md:grid-cols-12 gap-10\">
        <div className=\"md:col-span-8\">
          <div className=\"flex items-end justify-between gap-3 mb-6\">
            <div>
              <div className=\"text-[10px] uppercase tracking-[0.22em] text-[#8A1538] font-semibold\">
                Press notes feed
              </div>
              <h2 className=\"font-display text-2xl sm:text-3xl tracking-tight mt-1\">
                Latest from OU.
              </h2>
            </div>
            <div className=\"text-xs text-gray-500 hidden md:block\">
              {items.length} result{items.length === 1 ? \"\" : \"s\"}
            </div>
          </div>

          {/* Filters */}
          <div className=\"grid grid-cols-1 sm:grid-cols-3 gap-2 mb-5\">
            <div className=\"relative sm:col-span-1\">
              <Search
                size={14}
                className=\"absolute left-3 top-1/2 -translate-y-1/2 text-gray-400\"
              />
              <Input
                data-testid={HOME.searchInput}
                placeholder=\"Search title…\"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className=\"pl-9 rounded-md border-gray-300 focus-visible:ring-[#8A1538] focus-visible:border-[#8A1538]\"
              />
            </div>
            <Select value={course} onValueChange={setCourse}>
              <SelectTrigger
                data-testid={HOME.courseFilter}
                className=\"rounded-md border-gray-300\"
              >
                <SelectValue placeholder=\"Course\" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value=\"All\">All courses</SelectItem>
                {courses.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger
                data-testid={HOME.categoryFilter}
                className=\"rounded-md border-gray-300\"
              >
                <SelectValue placeholder=\"Type\" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <NotificationsList items={items} loading={loading} />
        </div>

        <aside className=\"md:col-span-4\">
          <div className=\"md:sticky md:top-24\">
            <SubscribeForm courses={courses} />
            <div className=\"mt-6 border border-gray-200 bg-white p-5 rounded-md\">
              <div className=\"text-[10px] uppercase tracking-[0.22em] text-gray-500 font-medium\">
                How it works
              </div>
              <ol className=\"mt-3 space-y-3 text-sm text-gray-700\">
                <Step n=\"01\" text=\"Our crawler hits ouexams.in/press every 10 minutes.\" />
                <Step n=\"02\" text=\"New press notes are categorized by course (B.E, MBA, B.Com…).\" />
                <Step n=\"03\" text=\"If your course matches, we WhatsApp you immediately.\" />
              </ol>
            </div>
          </div>
        </aside>
      </section>

      <footer className=\"border-t border-gray-200 mt-8\">
        <div className=\"max-w-7xl mx-auto px-6 md:px-10 py-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 text-xs text-gray-500\">
          <div>
            <span className=\"font-display font-bold text-gray-900\">OU Pulse</span>{\" \"}
            · An independent notification mirror for{\" \"}
            <a
              className=\"text-[#8A1538] hover:underline\"
              href=\"http://www.ouexams.in/press\"
              target=\"_blank\"
              rel=\"noreferrer\"
            >
              ouexams.in
            </a>
          </div>
          <div className=\"font-mono\">Built for students, by students.</div>
        </div>
      </footer>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className=\"border border-gray-200 bg-white p-3 rounded-md\">
      <div className=\"font-display text-2xl font-bold tracking-tight\">{value}</div>
      <div className=\"text-[10px] uppercase tracking-[0.18em] text-gray-500 mt-1\">
        {label}
      </div>
    </div>
  );
}

function Step({ n, text }) {
  return (
    <li className=\"flex gap-3\">
      <span className=\"font-mono text-[11px] text-[#8A1538] mt-0.5\">{n}</span>
      <span className=\"leading-relaxed\">{text}</span>
    </li>
  );
}
"
