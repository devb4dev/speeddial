"import { useMemo } from \"react\";
import { ArrowUpRight, FileText, CalendarDays } from \"lucide-react\";
import { Badge } from \"@/components/ui/badge\";
import { HOME } from \"@/constants/testIds\";

const CATEGORY_COLORS = {
  Notification: \"bg-gray-100 text-gray-700 border-gray-200\",
  Timetable: \"bg-amber-100 text-amber-900 border-amber-200\",
  Results: \"bg-emerald-100 text-emerald-900 border-emerald-200\",
  Update: \"bg-blue-100 text-blue-900 border-blue-200\",
};

function isFresh(scrapedAt) {
  if (!scrapedAt) return false;
  const ts = new Date(scrapedAt).getTime();
  return Date.now() - ts < 72 * 60 * 60 * 1000; // 72h
}

export default function NotificationsList({ items = [], loading }) {
  const sorted = useMemo(() => items, [items]);
  if (loading) {
    return (
      <div className=\"space-y-2\">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className=\"h-16 border border-gray-200 bg-white animate-pulse rounded-md\"
          />
        ))}
      </div>
    );
  }
  if (sorted.length === 0) {
    return (
      <div className=\"border border-dashed border-gray-300 p-12 text-center rounded-md bg-white\">
        <FileText className=\"mx-auto text-gray-300\" size={32} />
        <p className=\"mt-3 text-sm text-gray-500\">
          No notifications match your filters yet.
        </p>
      </div>
    );
  }
  return (
    <ul
      data-testid={HOME.notificationsList}
      className=\"divide-y divide-gray-200 border border-gray-200 bg-white rounded-md overflow-hidden\"
    >
      {sorted.map((n) => {
        const fresh = isFresh(n.first_seen_at || n.scraped_at);
        const catCls =
          CATEGORY_COLORS[n.category] || CATEGORY_COLORS.Notification;
        return (
          <li
            key={n.id}
            data-testid={HOME.notificationItem}
            className=\"group p-4 md:p-5 hover:bg-[#FAFAFA] transition-colors\"
          >
            <div className=\"flex flex-col md:flex-row md:items-center gap-3 md:gap-5\">
              <div className=\"md:w-28 shrink-0 flex items-center gap-2 text-xs text-gray-500\">
                <CalendarDays size={14} className=\"text-[#8A1538]\" />
                <span className=\"font-mono\">{n.date_raw}</span>
              </div>
              <div className=\"flex-1 min-w-0\">
                <div className=\"flex items-start gap-2\">
                  {fresh && (
                    <span className=\"inline-flex items-center gap-1 mt-1 text-[10px] uppercase tracking-[0.18em] text-[#8A1538] font-bold\">
                      <span className=\"w-1.5 h-1.5 rounded-full bg-[#8A1538] pulse-dot\" />
                      New
                    </span>
                  )}
                  <a
                    href={n.source_url}
                    target=\"_blank\"
                    rel=\"noreferrer noopener\"
                    className=\"font-medium text-[15px] leading-snug text-gray-900 group-hover:text-[#8A1538] transition-colors\"
                  >
                    {n.title}
                  </a>
                </div>
                <div className=\"mt-2 flex flex-wrap items-center gap-1.5\">
                  <Badge
                    variant=\"outline\"
                    className={`text-[10px] uppercase tracking-[0.15em] ${catCls}`}
                  >
                    {n.category}
                  </Badge>
                  {(n.courses || []).map((c) => (
                    <Badge
                      key={c}
                      variant=\"outline\"
                      className=\"text-[10px] bg-white border-gray-300 text-gray-700\"
                    >
                      {c}
                    </Badge>
                  ))}
                </div>
              </div>
              <a
                href={n.source_url}
                target=\"_blank\"
                rel=\"noreferrer noopener\"
                className=\"self-start md:self-center inline-flex items-center gap-1 text-xs text-[#8A1538] hover:text-[#70112d] transition-colors\"
              >
                Open <ArrowUpRight size={14} />
              </a>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
"
