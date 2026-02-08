'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { diagnosticReportService, DiagnosticReport } from '@/lib/services/diagnosticreport-service'

function DiagnosticReportsContent() {
  const searchParams = useSearchParams()
  const patientId = searchParams.get('patientId')
  
  const [reports, setReports] = useState<DiagnosticReport[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [filterCategory, setFilterCategory] = useState<string>('')

  useEffect(() => {
    loadReports()
  }, [patientId, filterStatus, filterCategory])

  const loadReports = async () => {
    try {
      const filters: any = { _count: 50 }
      if (patientId) {
        filters.patient = `Patient/${patientId}`
      }
      if (filterStatus) {
        filters.status = filterStatus
      }
      if (filterCategory) {
        filters.category = filterCategory
      }
      const data = await diagnosticReportService.search(filters)
      setReports(data)
    } catch (error) {
      console.error('Error loading diagnostic reports:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status?: string) => {
    if (!status) return 'bg-gray-100 text-gray-800'
    switch (status.toLowerCase()) {
      case 'final':
        return 'bg-green-100 text-green-800'
      case 'preliminary':
        return 'bg-yellow-100 text-yellow-800'
      case 'partial':
        return 'bg-blue-100 text-blue-800'
      case 'amended':
        return 'bg-purple-100 text-purple-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      case 'registered':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleString()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading diagnostic reports...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Diagnostic Reports</h1>
          <p className="text-gray-600 mt-2">View and manage lab results, imaging reports, and diagnostic tests</p>
        </div>
        <Link
          href={`/diagnosticreports/new${patientId ? `?patientId=${patientId}` : ''}`}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition flex items-center gap-2"
        >
          <span>➕</span> Create Report
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Status:</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              <option value="">All Statuses</option>
              <option value="registered">Registered</option>
              <option value="partial">Partial</option>
              <option value="preliminary">Preliminary</option>
              <option value="final">Final</option>
              <option value="amended">Amended</option>
              <option value="corrected">Corrected</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Category:</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              <option value="">All Categories</option>
              <option value="LAB">Laboratory</option>
              <option value="RAD">Radiology</option>
              <option value="PATH">Pathology</option>
              <option value="CUS">Cardiac Ultrasound</option>
            </select>
          </div>
        </div>
      </div>

      {/* Reports List */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {reports.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {reports.map((report) => {
              const patientRef = report.subject?.reference
              const patientIdFromRef = patientRef?.split('/')[1]
              
              return (
                <Link
                  key={report.id}
                  href={`/diagnosticreports/${report.id}`}
                  className="block p-6 hover:bg-gray-50 transition"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-medium text-gray-900">
                          {report.code?.text || report.code?.coding?.[0]?.display || 'Diagnostic Report'}
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(report.status)}`}>
                          {report.status || 'Unknown'}
                        </span>
                        {report.category && report.category.length > 0 && (
                          <span className="px-2 py-1 rounded text-xs bg-indigo-100 text-indigo-800">
                            {report.category[0].coding?.[0]?.display || report.category[0].text || 'Report'}
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                        {report.effectiveDateTime && (
                          <div>
                            <span className="font-medium">Date:</span>{' '}
                            {formatDateTime(report.effectiveDateTime)}
                          </div>
                        )}
                        {report.issued && (
                          <div>
                            <span className="font-medium">Issued:</span>{' '}
                            {formatDateTime(report.issued)}
                          </div>
                        )}
                        {report.performer && report.performer.length > 0 && (
                          <div>
                            <span className="font-medium">Performer:</span>{' '}
                            {report.performer[0].display || 'N/A'}
                          </div>
                        )}
                      </div>
                      {report.conclusion && (
                        <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                          {report.conclusion}
                        </p>
                      )}
                      {patientIdFromRef && (
                        <p className="text-sm text-gray-500 mt-2">
                          Patient: {patientIdFromRef.substring(0, 8)}...
                        </p>
                      )}
                    </div>
                    <span className="text-blue-600 ml-4 text-xl">→</span>
                  </div>
                </Link>
              )
            })}
          </div>
        ) : (
          <div className="p-12 text-center">
            <span className="text-6xl block mb-4">🔬</span>
            <p className="text-gray-500 mb-4">No diagnostic reports found</p>
            <Link
              href="/diagnosticreports/new"
              className="text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-2"
            >
              <span>➕</span> Create your first report →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

export default function DiagnosticReportsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    }>
      <DiagnosticReportsContent />
    </Suspense>
  )
}

