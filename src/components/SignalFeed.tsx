import { useState, useEffect } from 'react';

interface Signal {
	id: string;
	watcherName: string;
	sourceType: string;
	title: string;
	url: string;
	summary?: string;
	publishedAt?: string;
	detectedAt: string;
}

interface Props {
	watcher?: string;
	limit?: number;
}

export function SignalFeed({ watcher, limit = 20 }: Props) {
	const [signals, setSignals] = useState<Signal[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const params = new URLSearchParams({ limit: String(limit) });
		if (watcher) params.set('watcher', watcher);
		fetch(`/api/proxy/signals?${params}`)
			.then((r) => r.json() as Promise<Signal[]>)
			.then(setSignals)
			.catch(() => setError('Failed to load signals'))
			.finally(() => setLoading(false));
	}, [watcher, limit]);

	if (loading) return <p className="text-gray-500 text-sm">Loading signals…</p>;
	if (error) return <p className="text-red-600 text-sm">{error}</p>;
	if (signals.length === 0) return <p className="text-gray-500 text-sm">No signals yet.</p>;

	return (
		<ul className="divide-y divide-gray-200">
			{signals.map((s) => (
				<li key={s.id} className="py-4">
					<div className="flex items-start justify-between gap-4">
						<div className="min-w-0">
							<a
								href={s.url}
								target="_blank"
								rel="noopener noreferrer"
								className="font-medium text-sm text-blue-700 hover:underline truncate block"
							>
								{s.title}
							</a>
							{s.summary && <p className="text-xs text-gray-600 mt-1 line-clamp-2">{s.summary}</p>}
							<p className="text-xs text-gray-400 mt-1">
								{s.watcherName} · {s.sourceType} · {new Date(s.detectedAt).toLocaleString()}
							</p>
						</div>
					</div>
				</li>
			))}
		</ul>
	);
}
