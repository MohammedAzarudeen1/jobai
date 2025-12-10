import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="max-w-4xl w-full text-center">
        <h1 className="text-5xl font-bold mb-6 text-gray-900 dark:text-white">
          JobAI
        </h1>
        <p className="text-xl mb-8 text-gray-700 dark:text-gray-300">
          AI-Powered Job Application Assistant
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/dashboard"
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </main>
  )
}

