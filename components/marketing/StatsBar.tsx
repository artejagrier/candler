import { STATS } from "@/config/marketing";

export function StatsBar() {
  return (
    <dl className="grid grid-cols-2 gap-6 rounded-3xl border border-line bg-white/[0.02] px-6 py-8 sm:grid-cols-4">
      {STATS.map((stat) => (
        <div key={stat.label} className="text-center">
          <dt className="sr-only">{stat.label}</dt>
          <dd>
            <span className="block text-3xl font-semibold tracking-tight text-white">
              {stat.value}
            </span>
            <span className="mt-1 block text-sm text-fog">{stat.label}</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}
