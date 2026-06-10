"import { useState } from \"react\";
import { toast } from \"sonner\";
import { CheckCircle2, Loader2, Phone, User } from \"lucide-react\";
import { Input } from \"@/components/ui/input\";
import { Button } from \"@/components/ui/button\";
import { Badge } from \"@/components/ui/badge\";
import { FORM } from \"@/constants/testIds\";
import { subscribe } from \"@/lib/api\";

export default function SubscribeForm({ courses = [] }) {
  const [name, setName] = useState(\"\");
  const [phone, setPhone] = useState(\"\");
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const toggleCourse = (c) => {
    setSelected((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );
  };

  const submit = async (e) => {
    e.preventDefault();
    if (selected.length === 0) {
      toast.error(\"Pick at least one course\");
      return;
    }
    if (name.trim().length < 2) {
      toast.error(\"Enter your name\");
      return;
    }
    if (phone.replace(/\D/g, \"\").length < 8) {
      toast.error(\"Enter a valid phone number\");
      return;
    }
    setLoading(true);
    try {
      await subscribe({ name: name.trim(), phone, courses: selected });
      toast.success(\"You're in. We'll ping you the moment we spot an update.\");
      setDone(true);
    } catch (err) {
      toast.error(err?.response?.data?.detail || \"Subscription failed\");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div
        id=\"subscribe\"
        data-testid={FORM.formCard}
        className=\"border border-gray-200 bg-white p-8 md:p-10 shadow-crisp rounded-md\"
      >
        <CheckCircle2 className=\"text-[#8A1538]\" size={28} />
        <h3 className=\"font-display text-2xl mt-3 tracking-tight\">
          You're subscribed.
        </h3>
        <p className=\"text-gray-600 mt-2 text-sm leading-relaxed\">
          We'll deliver a WhatsApp ping to <span className=\"font-mono\">{phone}</span>{\" \"}
          the moment OU publishes anything for{\" \"}
          <span className=\"font-medium\">{selected.join(\", \")}</span>.
        </p>
        <button
          onClick={() => {
            setDone(false);
            setName(\"\");
            setPhone(\"\");
            setSelected([]);
          }}
          className=\"mt-5 text-xs uppercase tracking-[0.18em] text-[#8A1538] hover:underline\"
        >
          Add another subscriber →
        </button>
      </div>
    );
  }

  return (
    <form
      id=\"subscribe\"
      data-testid={FORM.formCard}
      onSubmit={submit}
      className=\"border border-gray-200 bg-white p-6 md:p-8 shadow-crisp rounded-md\"
    >
      <div className=\"text-[10px] uppercase tracking-[0.22em] text-[#8A1538] font-medium\">
        Step 01 — Free alerts
      </div>
      <h3 className=\"font-display text-2xl md:text-3xl mt-1 tracking-tight\">
        Don't miss your timetable.
      </h3>
      <p className=\"text-sm text-gray-600 mt-2 leading-relaxed\">
        Pick your course(s). We'll WhatsApp you within minutes of any new press
        note. No spam, ever.
      </p>

      <div className=\"mt-6 space-y-4\">
        <div>
          <label className=\"text-[11px] uppercase tracking-[0.18em] text-gray-500\">
            Full name
          </label>
          <div className=\"mt-1.5 relative\">
            <User
              size={15}
              className=\"absolute left-3 top-1/2 -translate-y-1/2 text-gray-400\"
            />
            <Input
              data-testid={FORM.name}
              placeholder=\"e.g. Aarti Reddy\"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className=\"pl-9 rounded-md border-gray-300 focus-visible:ring-[#8A1538] focus-visible:border-[#8A1538]\"
            />
          </div>
        </div>

        <div>
          <label className=\"text-[11px] uppercase tracking-[0.18em] text-gray-500\">
            WhatsApp number
          </label>
          <div className=\"mt-1.5 relative\">
            <Phone
              size={15}
              className=\"absolute left-3 top-1/2 -translate-y-1/2 text-gray-400\"
            />
            <Input
              data-testid={FORM.phone}
              placeholder=\"+91 9XXXXXXXXX\"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className=\"pl-9 font-mono rounded-md border-gray-300 focus-visible:ring-[#8A1538] focus-visible:border-[#8A1538]\"
            />
          </div>
        </div>

        <div>
          <label className=\"text-[11px] uppercase tracking-[0.18em] text-gray-500\">
            Your course(s) · pick any
          </label>
          <div
            data-testid={FORM.courses}
            className=\"mt-2 flex flex-wrap gap-1.5 max-h-48 overflow-y-auto p-2 border border-gray-200 rounded-md bg-[#FAFAFA]\"
          >
            {courses.length === 0 && (
              <span className=\"text-xs text-gray-400 p-2\">
                Loading courses…
              </span>
            )}
            {courses.map((c) => {
              const on = selected.includes(c);
              return (
                <button
                  type=\"button\"
                  key={c}
                  data-testid={`course-chip-${c}`}
                  onClick={() => toggleCourse(c)}
                  className={`text-xs px-2.5 py-1.5 rounded-md border transition-colors ${
                    on
                      ? \"bg-[#8A1538] text-white border-[#8A1538]\"
                      : \"bg-white text-gray-700 border-gray-300 hover:border-[#8A1538] hover:text-[#8A1538]\"
                  }`}
                >
                  {c}
                </button>
              );
            })}
          </div>
          {selected.length > 0 && (
            <div className=\"mt-2 text-xs text-gray-500\">
              Subscribed to{\" \"}
              <Badge variant=\"secondary\" className=\"bg-amber-100 text-amber-900 border border-amber-200\">
                {selected.length}
              </Badge>{\" \"}
              {selected.length === 1 ? \"course\" : \"courses\"}
            </div>
          )}
        </div>

        <Button
          type=\"submit\"
          data-testid={FORM.submit}
          disabled={loading}
          className=\"w-full bg-[#8A1538] hover:bg-[#70112d] text-white rounded-md transition-colors h-11\"
        >
          {loading ? (
            <>
              <Loader2 size={14} className=\"animate-spin mr-2\" /> Subscribing
            </>
          ) : (
            \"Subscribe to alerts →\"
          )}
        </Button>
        <p className=\"text-[10px] uppercase tracking-[0.18em] text-gray-400 text-center\">
          WhatsApp delivery currently in <span className=\"text-amber-700 font-medium\">mock mode</span>
        </p>
      </div>
    </form>
  );
}
"
