import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0B1220] text-[#E6EDF6]">
      <div className="mx-auto max-w-4xl px-6 py-16">
        <h1 className="text-3xl font-semibold tracking-tight">Take Care Patient</h1>
        <p className="mt-3 text-[#A7B3C7]">
          Upload prescription → OCR processing → Review/Confirm → Calendar reminders.
        </p>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/login"
            className="inline-flex h-11 items-center justify-center rounded-md bg-[#4F8CFF] px-5 font-medium text-white"
          >
            Login
          </Link>
          <Link
            href="/app"
            className="inline-flex h-11 items-center justify-center rounded-md border border-white/10 px-5 font-medium"
          >
            Go to App
          </Link>
        </div>
      </div>
    </div>
  );
}
