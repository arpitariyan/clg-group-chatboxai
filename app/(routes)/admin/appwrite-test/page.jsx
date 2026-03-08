'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2, XCircle, RefreshCcw, Database, FolderArchive } from 'lucide-react';

const StatusPill = ({ ok, label }) => (
  <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${ok ? 'bg-green-500/15 text-green-600' : 'bg-red-500/15 text-red-600'}`}>
    {ok ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
    {label}
  </span>
);

export default function AppwriteTestPage() {
  const [loading, setLoading] = useState(true);
  const [envResult, setEnvResult] = useState(null);
  const [dbResult, setDbResult] = useState(null);
  const [error, setError] = useState('');

  const runTests = async () => {
    setLoading(true);
    setError('');

    try {
      const [envRes, dbRes] = await Promise.all([
        fetch('/api/test-env', { cache: 'no-store' }),
        fetch('/api/test-db', { cache: 'no-store' }),
      ]);

      const envJson = await envRes.json();
      const dbJson = await dbRes.json();

      setEnvResult({ status: envRes.status, ...envJson });
      setDbResult({ status: dbRes.status, ...dbJson });
    } catch (err) {
      setError(err?.message || 'Failed to run diagnostics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runTests();
  }, []);

  const envList = useMemo(() => {
    if (!envResult?.environment) return [];
    return Object.entries(envResult.environment);
  }, [envResult]);

  const collectionChecks = dbResult?.checks?.collections || [];

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Appwrite Test</h1>
          <p className="text-muted-foreground mt-1">
            Live environment and connectivity diagnostics for Appwrite services.
          </p>
        </div>
        <Button onClick={runTests} disabled={loading}>
          <RefreshCcw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Re-run checks
        </Button>
      </div>

      {error ? (
        <Card>
          <CardContent className="py-6">
            <p className="text-sm text-red-600">{error}</p>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="dark:bg-[oklch(0.2478_0_0)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Environment
            </CardTitle>
            <CardDescription>Configured variable checks</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array(6).fill(0).map((_, index) => (
                  <Skeleton key={index} className="h-5 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {envList.map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between border-b pb-2 last:border-0">
                    <span className="text-sm">{key}</span>
                    <StatusPill ok={Boolean(value)} label={value ? 'OK' : 'Missing'} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="dark:bg-[oklch(0.2478_0_0)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderArchive className="w-5 h-5" />
              Database & Storage
            </CardTitle>
            <CardDescription>Live connectivity checks using Appwrite admin client</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array(5).fill(0).map((_, index) => (
                  <Skeleton key={index} className="h-5 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="text-sm">Overall Status</span>
                  <StatusPill ok={Boolean(dbResult?.success)} label={dbResult?.success ? 'PASS' : 'FAIL'} />
                </div>
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="text-sm">Checks Passed</span>
                  <span className="text-sm font-medium">
                    {dbResult?.summary?.passedChecks || 0}/{dbResult?.summary?.totalChecks || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="text-sm">Storage Bucket</span>
                  <StatusPill ok={Boolean(dbResult?.checks?.storage?.success)} label={dbResult?.checks?.storage?.success ? 'Reachable' : 'Error'} />
                </div>
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {collectionChecks.map((item) => (
                    <div key={item.key} className="flex items-center justify-between border-b pb-2 last:border-0">
                      <span className="text-sm">{item.key}</span>
                      <StatusPill ok={Boolean(item.success)} label={item.success ? 'Reachable' : 'Error'} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {!loading && dbResult?.success === false ? (
        <Card className="dark:bg-[oklch(0.2478_0_0)]">
          <CardHeader>
            <CardTitle>Failure Details</CardTitle>
            <CardDescription>Errors returned by Appwrite diagnostics</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-muted p-4 rounded-md overflow-auto whitespace-pre-wrap wrap-break-word">
              {JSON.stringify(dbResult, null, 2)}
            </pre>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}