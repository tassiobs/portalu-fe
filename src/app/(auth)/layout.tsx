export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-xl border border-gray-200 shadow-sm p-8">
        <div className="mb-8 text-center">
          <span className="text-2xl font-bold text-blue-600">portalu</span>
        </div>
        {children}
      </div>
    </div>
  )
}
