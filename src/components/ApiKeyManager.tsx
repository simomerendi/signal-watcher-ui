import { useState, useEffect } from 'react';

interface ApiKey {
	id: string;
	name?: string;
	start?: string;
	createdAt: number;
	expiresAt?: number;
	enabled: boolean;
}

export function ApiKeyManager() {
	const [keys, setKeys] = useState<ApiKey[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [newKeyName, setNewKeyName] = useState('');
	const [newKey, setNewKey] = useState<string | null>(null);
	const [creating, setCreating] = useState(false);

	const loadKeys = () => {
		setLoading(true);
		fetch('/api/auth/api-key/list', { method: 'GET' })
			.then((r) => r.json() as Promise<{ apiKeys: ApiKey[] }>)
			.then((data) => setKeys(data.apiKeys ?? []))
			.catch(() => setError('Failed to load API keys'))
			.finally(() => setLoading(false));
	};

	useEffect(() => { loadKeys(); }, []);

	const createKey = async (e: React.FormEvent) => {
		e.preventDefault();
		setCreating(true);
		setNewKey(null);
		try {
			const res = await fetch('/api/auth/api-key/create', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: newKeyName || undefined }),
			});
			const data = await res.json() as { key?: string };
			if (data.key) {
				setNewKey(data.key);
				setNewKeyName('');
				loadKeys();
			} else {
				setError('Failed to create API key.');
			}
		} catch {
			setError('Failed to create API key.');
		} finally {
			setCreating(false);
		}
	};

	const revokeKey = async (id: string) => {
		await fetch('/api/auth/api-key/delete', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ keyId: id }),
		});
		loadKeys();
	};

	return (
		<div className="space-y-6">
			{newKey && (
				<div className="bg-yellow-50 border border-yellow-200 rounded p-4 text-sm">
					<p className="font-medium text-yellow-800 mb-1">New API Key — copy it now, it won't be shown again:</p>
					<code className="block bg-white border border-yellow-300 rounded px-3 py-2 font-mono text-xs break-all">
						{newKey}
					</code>
				</div>
			)}

			<form onSubmit={createKey} className="flex gap-2">
				<input
					type="text"
					placeholder="Key name (optional)"
					value={newKeyName}
					onChange={(e) => setNewKeyName(e.target.value)}
					className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
				/>
				<button
					type="submit"
					disabled={creating}
					className="bg-blue-600 text-white rounded px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
				>
					{creating ? 'Creating…' : 'Create Key'}
				</button>
			</form>

			{error && <p className="text-red-600 text-sm">{error}</p>}

			{loading ? (
				<p className="text-gray-500 text-sm">Loading keys…</p>
			) : keys.length === 0 ? (
				<p className="text-gray-500 text-sm">No API keys yet.</p>
			) : (
				<ul className="divide-y divide-gray-200">
					{keys.map((k) => (
						<li key={k.id} className="py-3 flex items-center justify-between gap-4">
							<div>
								<span className="text-sm font-medium">{k.name ?? 'Unnamed'}</span>
								{k.start && <span className="ml-2 text-xs text-gray-400 font-mono">{k.start}…</span>}
								<span className="ml-2 text-xs text-gray-400">
									Created {new Date(k.createdAt).toLocaleDateString()}
								</span>
							</div>
							<button
								onClick={() => revokeKey(k.id)}
								className="text-xs text-red-600 hover:underline"
							>
								Revoke
							</button>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
