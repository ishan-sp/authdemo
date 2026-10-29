const TEXT = {
  200: 'OK',
  201: 'Created',
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  409: 'Conflict',
  500: 'Server Error',
};

// Shows the raw HTTP status, so the class can see what the server decided.
export default function StatusPill({ status }) {
  if (!status) return <span className="pill pill-pending">…</span>;
  const kind = status < 300 ? 'ok' : status === 403 ? 'forbidden' : 'error';
  return (
    <span className={`pill pill-${kind}`}>
      {status} {TEXT[status] ?? ''}
    </span>
  );
}
