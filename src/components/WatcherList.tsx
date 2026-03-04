import { useState, useEffect } from 'react';

interface Watcher {
	name: string;
	sourceType: string;
	enabled: boolean;
	createdAt: string;
}

export function WatcherList() {
	const [watchers, setWatchers] = useState<Watcher[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		fetch('/api/proxy/watchers')
			.then((r) => r.json() as Promise<Watcher[]>)
			.then(setWatchers)
			.catch(() => setError('Failed to load watchers'))
			.finally(() => setLoading(false));
	}, []);

	if (loading) return <p className="text-gray-500 text-sm">Loading watchers…</p>;
	if (error) return <p className="text-red-600 text-sm">{error}</p>;
	if (watchers.length === 0) return <p className="text-gray-500 text-sm">No watchers configured yet.</p>;

	return (
		<ul className="divide-y divide-gray-200">
			{watchers.map((w) => (
				<li key={w.name} className="py-3 flex items-center justify-between">
					<div>
						<span className="font-medium text-sm">{w.name}</span>
						<span className="ml-2 text-xs text-gray-500">{w.sourceType}</span>
					</div>
					<span
						className={`text-xs px-2 py-0.5 rounded-full ${w.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
					>
						{w.enabled ? 'active' : 'paused'}
					</span>
				</li>
			))}
		</ul>
	);
}
