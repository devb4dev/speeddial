"import { useEffect, useState } from \"react\";
import { RefreshCcw, Users, Activity, MessageSquare, FileClock } from \"lucide-react\";
import { Tabs, TabsList, TabsTrigger, TabsContent } from \"@/components/ui/tabs\";
import { Button } from \"@/components/ui/button\";
import { Badge } from \"@/components/ui/badge\";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from \"@/components/ui/table\";
import { ADMIN } from \"@/constants/testIds\";
import {
  getStats,
  getSubscribers,
  getLogs,
  getQueue,
  triggerScrape,
} from \"@/lib/api\";
import { toast } from \"sonner\";

export default function Admin() {
  const [stats, setStats] = useState(null);
  const [subs, setSubs] = useState([]);
  const [logs, setLogs] = useState([]);
  const [queue, setQueue] = useState([]);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const [s, sub, l, q] = await Promise.all([
        getStats(),
        getSubscribers(),
        getLogs(),
        getQueue(),
      ]);
      setStats(s);
      setSubs(sub);
      setLogs(l);
      setQueue(q);
    } catch (e) {
      toast.error(\"Failed to load admin data\");
    }
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, []);

  const runScrape = async () => {
    setBusy(true);
    try {
      const r = await triggerScrape();
      toast.success(
        r.new_items != null
          ? `Scrape complete — ${r.new_items} new note(s)`
          : \"Scrape complete\"
      );
      await load();
    } catch (e) {
      toast.error(\"Scrape failed\");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className=\"max-w-7xl mx-auto px-6 md:px-10 py-10\">
      <div className=\"flex items-end justify-between flex-wrap gap-3 mb-8\">
        <div>
          <div className=\"text-[10px] uppercase tracking-[0.22em] text-[#8A1538] font-semibold\">
            Control room
          </div>
          <h1 className=\"font-display text-3xl md:text-4xl tracking-tight mt-1\">
            Admin · OU Pulse
          </h1>
        </div>
        <Button
          data-testid={ADMIN.scrapeNow}
          onClick={runScrape}
          disabled={busy}
          className=\"bg-[#8A1538] hover:bg-[#70112d] text-white rounded-md transition-colors\"
        >
          <RefreshCcw size={14} className={`mr-2 ${busy ? \"animate-spin\" : \"\"}`} />
          Run scrape now
        </Button>
      </div>

      <div
        data-testid={ADMIN.stats}
        className=\"grid grid-cols-2 md:grid-cols-4 gap-3 mb-10\"
      >
        <StatCard icon={<FileClock size={16} />} label=\"Notifications\" value={stats?.total_notifications ?? \"—\"} />
        <StatCard icon={<Users size={16} />} label=\"Subscribers\" value={stats?.total_subscribers ?? \"—\"} />
        <StatCard icon={<MessageSquare size={16} />} label=\"Alerts sent (mock)\" value={stats?.total_sent ?? \"—\"} />
        <StatCard icon={<Activity size={16} />} label=\"Next scrape\" value={fmtTime(stats?.next_scrape_at)} />
      </div>

      <Tabs defaultValue=\"queue\" data-testid={ADMIN.tabs}>
        <TabsList className=\"bg-gray-100 rounded-md\">
          <TabsTrigger value=\"queue\">WhatsApp queue</TabsTrigger>
          <TabsTrigger value=\"subs\">Subscribers</TabsTrigger>
          <TabsTrigger value=\"logs\">Scrape logs</TabsTrigger>
        </TabsList>

        <TabsContent value=\"queue\">
          <div data-testid={ADMIN.queue} className=\"border border-gray-200 bg-white rounded-md overflow-hidden\">
            <Table>
              <TableHeader>
                <TableRow className=\"bg-[#FAFAFA]\">
                  <Th>Phone</Th>
                  <Th>Subscriber</Th>
                  <Th>Course matched</Th>
                  <Th className=\"min-w-[300px]\">Notification</Th>
                  <Th>Status</Th>
                  <Th>Sent</Th>
                </TableRow>
              </TableHeader>
              <TableBody>
                {queue.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className=\"text-center text-gray-500 py-8\">
                      No outbound messages yet. Mock WhatsApp queue is empty.
                    </TableCell>
                  </TableRow>
                )}
                {queue.map((q) => (
                  <TableRow key={q.id}>
                    <TableCell className=\"font-mono text-xs\">{q.phone}</TableCell>
                    <TableCell className=\"text-sm\">{q.subscriber_name}</TableCell>
                    <TableCell>
                      <Badge variant=\"outline\" className=\"text-[10px]\">
                        {q.matched_course}
                      </Badge>
                    </TableCell>
                    <TableCell className=\"text-sm max-w-md truncate\">
                      {q.title}
                    </TableCell>
                    <TableCell>
                      <Badge className={
                        q.status === \"sent\"
                          ? \"bg-emerald-100 text-emerald-900 border-emerald-200\"
                          : \"bg-amber-100 text-amber-900 border-amber-200\"
                      }>
                        {q.status} (mock)
                      </Badge>
                    </TableCell>
                    <TableCell className=\"text-xs text-gray-500 font-mono whitespace-nowrap\">
                      {fmtTime(q.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value=\"subs\">
          <div data-testid={ADMIN.subscribers} className=\"border border-gray-200 bg-white rounded-md overflow-hidden\">
            <Table>
              <TableHeader>
                <TableRow className=\"bg-[#FAFAFA]\">
                  <Th>Name</Th>
                  <Th>Phone</Th>
                  <Th>Courses</Th>
                  <Th>Joined</Th>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className=\"text-center text-gray-500 py-8\">
                      No subscribers yet.
                    </TableCell>
                  </TableRow>
                )}
                {subs.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className=\"text-sm font-medium\">{s.name}</TableCell>
                    <TableCell className=\"font-mono text-xs\">{s.phone}</TableCell>
                    <TableCell>
                      <div className=\"flex flex-wrap gap-1\">
                        {s.courses.map((c) => (
                          <Badge key={c} variant=\"outline\" className=\"text-[10px]\">
                            {c}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className=\"text-xs text-gray-500 font-mono\">
                      {fmtTime(s.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value=\"logs\">
          <div data-testid={ADMIN.logs} className=\"border border-gray-200 bg-white rounded-md overflow-hidden\">
            <Table>
              <TableHeader>
                <TableRow className=\"bg-[#FAFAFA]\">
                  <Th>Started</Th>
                  <Th>Status</Th>
                  <Th>Fetched</Th>
                  <Th>New</Th>
                  <Th>Dispatched</Th>
                  <Th>Error</Th>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className=\"text-center text-gray-500 py-8\">
                      No scrape logs yet.
                    </TableCell>
                  </TableRow>
                )}
                {logs.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className=\"text-xs font-mono\">{fmtTime(l.started_at)}</TableCell>
                    <TableCell>
                      <Badge className={
                        l.status === \"success\"
                          ? \"bg-emerald-100 text-emerald-900 border-emerald-200\"
                          : l.status === \"running\"
                            ? \"bg-blue-100 text-blue-900 border-blue-200\"
                            : \"bg-rose-100 text-rose-900 border-rose-200\"
                      }>
                        {l.status}
                      </Badge>
                    </TableCell>
                    <TableCell className=\"text-sm\">{l.fetched}</TableCell>
                    <TableCell className=\"text-sm font-medium text-[#8A1538]\">
                      {l.new_items}
                    </TableCell>
                    <TableCell className=\"text-sm\">{l.notifications_dispatched}</TableCell>
                    <TableCell className=\"text-xs text-rose-700 max-w-xs truncate\">
                      {l.error || \"—\"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ icon, label, value }) {
  return (
    <div className=\"border border-gray-200 bg-white p-4 rounded-md\">
      <div className=\"flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-gray-500\">
        <span className=\"text-[#8A1538]\">{icon}</span>
        {label}
      </div>
      <div className=\"font-display text-2xl font-bold tracking-tight mt-2\">
        {value}
      </div>
    </div>
  );
}

function Th({ children, className = \"\" }) {
  return (
    <TableHead
      className={`text-[10px] uppercase tracking-[0.18em] text-gray-500 font-medium ${className}`}
    >
      {children}
    </TableHead>
  );
}

function fmtTime(iso) {
  if (!iso) return \"—\";
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return iso;
  }
}
"
