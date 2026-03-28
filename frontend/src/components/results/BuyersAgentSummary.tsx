interface BuyersAgentSummaryProps {
  summary: string
}

export default function BuyersAgentSummary({ summary }: BuyersAgentSummaryProps) {
  return (
    <div className="bg-slate-50 border-l-4 border-blue-500 rounded-r-2xl rounded-tl-2xl p-6 relative">
      {/* Quote mark */}
      <svg
        className="absolute top-4 right-5 w-10 h-10 text-slate-200"
        fill="currentColor"
        viewBox="0 0 32 32"
      >
        <path d="M10 8C5.6 8 2 11.6 2 16s3.6 8 8 8h.5l-1.8 4.5c-.3.7.3 1.5 1.1 1.5.4 0 .7-.2.9-.5L14 22.4c1.2-1.4 2-3.2 2-5.4 0-4.9-3.6-9-6-9zm14 0c-4.4 0-8 3.6-8 8s3.6 8 8 8h.5l-1.8 4.5c-.3.7.3 1.5 1.1 1.5.4 0 .7-.2.9-.5L28 22.4c1.2-1.4 2-3.2 2-5.4 0-4.9-3.6-9-6-9z" />
      </svg>

      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-bold text-slate-800">AI Buyers Agent</p>
          <p className="text-xs text-slate-500">PropScore Analysis</p>
        </div>
      </div>

      <blockquote className="text-slate-700 text-sm leading-relaxed italic pr-10">
        {summary}
      </blockquote>
    </div>
  )
}
