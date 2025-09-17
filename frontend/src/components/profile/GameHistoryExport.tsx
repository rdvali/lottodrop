import React, { useState, useCallback } from 'react'
import type { GameHistory, GameStatistics } from '../../types'
import { safeFormatDate } from '../../utils/dateUtils'
import styles from './GameHistoryExport.module.css'

interface GameHistoryExportProps {
  gameHistory: GameHistory[]
  statistics?: GameStatistics
  loading?: boolean
}

type ExportFormat = 'csv' | 'json' | 'excel'

export const GameHistoryExport: React.FC<GameHistoryExportProps> = ({
  gameHistory,
  statistics,
  loading = false
}) => {
  const [exporting, setExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)

  /**
   * Convert game history to CSV format
   */
  const convertToCSV = useCallback((data: GameHistory[]): string => {
    const headers = [
      'Date',
      'Room Name',
      'Entry Fee',
      'Result',
      'Prize',
      'Position',
      'Net Profit'
    ]

    const rows = data.map(game => {
      const netProfit = (game.prize || 0) - game.entryFee
      return [
        safeFormatDate(game.playedAt, 'yyyy-MM-dd HH:mm:ss', 'Invalid date'),
        `"${game.roomName}"`,
        (game.entryFee || 0).toFixed(2),
        game.result,
        game.prize ? (game.prize || 0).toFixed(2) : '0.00',
        game.position || '-',
        (netProfit || 0).toFixed(2)
      ]
    })

    // Add statistics summary at the end if available
    if (statistics) {
      rows.push([])
      rows.push(['Summary Statistics'])
      rows.push(['Total Games', statistics.totalGames.toString()])
      rows.push(['Games Won', statistics.totalWon.toString()])
      rows.push(['Games Lost', statistics.totalLost.toString()])
      rows.push(['Win Rate', `${(statistics.winRate || 0).toFixed(2)}%`])
      rows.push(['Total Winnings', `$${(statistics.totalWinnings || 0).toFixed(2)}`])
      rows.push(['Total Spent', `$${(statistics.totalSpent || 0).toFixed(2)}`])
      rows.push(['Net Profit', `$${((statistics.totalWinnings || 0) - (statistics.totalSpent || 0)).toFixed(2)}`])
      rows.push(['Biggest Win', `$${(statistics.biggestWin || 0).toFixed(2)}`])
      rows.push(['Average Entry Fee', `$${(statistics.averageEntryFee || 0).toFixed(2)}`])
    }

    return [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')
  }, [statistics])

  /**
   * Convert game history to JSON format
   */
  const convertToJSON = useCallback((data: GameHistory[]): string => {
    const exportData = {
      exportDate: new Date().toISOString(),
      totalRecords: data.length,
      statistics: statistics || null,
      games: data.map(game => ({
        ...game,
        netProfit: (game.prize || 0) - game.entryFee
      }))
    }

    return JSON.stringify(exportData, null, 2)
  }, [statistics])

  /**
   * Convert game history to Excel-compatible HTML format
   */
  const convertToExcel = useCallback((data: GameHistory[]): string => {
    const rows = data.map(game => {
      const netProfit = (game.prize || 0) - game.entryFee
      return `
        <tr>
          <td>${safeFormatDate(game.playedAt, 'yyyy-MM-dd HH:mm:ss', 'Invalid date')}</td>
          <td>${game.roomName}</td>
          <td>${(game.entryFee || 0).toFixed(2)}</td>
          <td>${game.result}</td>
          <td>${game.prize ? (game.prize || 0).toFixed(2) : '0.00'}</td>
          <td>${game.position || '-'}</td>
          <td style="color: ${netProfit >= 0 ? 'green' : 'red'}">${(netProfit || 0).toFixed(2)}</td>
        </tr>
      `
    }).join('')

    let statsSection = ''
    if (statistics) {
      const netProfit = statistics.totalWinnings - statistics.totalSpent
      statsSection = `
        <tr><td colspan="7"></td></tr>
        <tr><td colspan="7"><b>Summary Statistics</b></td></tr>
        <tr><td>Total Games</td><td>${statistics.totalGames}</td></tr>
        <tr><td>Games Won</td><td>${statistics.totalWon}</td></tr>
        <tr><td>Games Lost</td><td>${statistics.totalLost}</td></tr>
        <tr><td>Win Rate</td><td>${(statistics.winRate || 0).toFixed(2)}%</td></tr>
        <tr><td>Total Winnings</td><td>$${(statistics.totalWinnings || 0).toFixed(2)}</td></tr>
        <tr><td>Total Spent</td><td>$${(statistics.totalSpent || 0).toFixed(2)}</td></tr>
        <tr><td>Net Profit</td><td style="color: ${netProfit >= 0 ? 'green' : 'red'}">$${(netProfit || 0).toFixed(2)}</td></tr>
        <tr><td>Biggest Win</td><td>$${(statistics.biggestWin || 0).toFixed(2)}</td></tr>
        <tr><td>Average Entry Fee</td><td>$${(statistics.averageEntryFee || 0).toFixed(2)}</td></tr>
      `
    }

    return `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
        <head>
          <meta charset="UTF-8">
          <!--[if gte mso 9]>
          <xml>
            <x:ExcelWorkbook>
              <x:ExcelWorksheets>
                <x:ExcelWorksheet>
                  <x:Name>Game History</x:Name>
                  <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
                </x:ExcelWorksheet>
              </x:ExcelWorksheets>
            </x:ExcelWorkbook>
          </xml>
          <![endif]-->
        </head>
        <body>
          <table border="1">
            <thead>
              <tr>
                <th>Date</th>
                <th>Room Name</th>
                <th>Entry Fee</th>
                <th>Result</th>
                <th>Prize</th>
                <th>Position</th>
                <th>Net Profit</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
              ${statsSection}
            </tbody>
          </table>
        </body>
      </html>
    `
  }, [statistics])

  /**
   * Download file with streaming for large datasets
   */
  const downloadFile = useCallback(async (
    content: string,
    filename: string,
    mimeType: string
  ) => {
    // For large datasets, process in chunks
    const CHUNK_SIZE = 1000
    const totalSize = content.length
    let processedSize = 0

    // Simulate chunked processing for progress
    const processChunk = () => {
      processedSize = Math.min(processedSize + CHUNK_SIZE, totalSize)
      const progress = Math.round((processedSize / totalSize) * 100)
      setExportProgress(progress)
      
      if (processedSize < totalSize) {
        setTimeout(processChunk, 10) // Process next chunk
      } else {
        // Create blob and download
        const blob = new Blob([content], { type: mimeType })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
        
        setExporting(false)
        setExportProgress(0)
      }
    }

    processChunk()
  }, [])

  /**
   * Export game history in selected format
   */
  const exportData = useCallback(async (exportFormat: ExportFormat) => {
    if (gameHistory.length === 0) {
      alert('No data to export')
      return
    }

    setExporting(true)
    setExportProgress(0)

    try {
      const timestamp = safeFormatDate(new Date(), 'yyyy-MM-dd_HH-mm-ss', 'export')
      let content: string
      let filename: string
      let mimeType: string

      switch (exportFormat) {
        case 'csv':
          content = convertToCSV(gameHistory)
          filename = `game_history_${timestamp}.csv`
          mimeType = 'text/csv;charset=utf-8;'
          break

        case 'json':
          content = convertToJSON(gameHistory)
          filename = `game_history_${timestamp}.json`
          mimeType = 'application/json;charset=utf-8;'
          break

        case 'excel':
          content = convertToExcel(gameHistory)
          filename = `game_history_${timestamp}.xls`
          mimeType = 'application/vnd.ms-excel;charset=utf-8;'
          break

        default:
          throw new Error('Invalid export format')
      }

      await downloadFile(content, filename, mimeType)
    } catch (error) {
      console.error('Export failed:', error)
      alert('Failed to export data')
      setExporting(false)
      setExportProgress(0)
    }
  }, [gameHistory, convertToCSV, convertToJSON, convertToExcel, downloadFile])

  return (
    <div className={styles.exportContainer}>
      <h3 className={styles.exportTitle}>Export Data</h3>
      
      <div className={styles.exportButtons}>
        <button
          className={`${styles.exportButton} ${styles.csv}`}
          onClick={() => exportData('csv')}
          disabled={loading || exporting || gameHistory.length === 0}
        >
          <svg className={styles.icon} viewBox="0 0 24 24" fill="none">
            <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 11V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M9 14L12 17L15 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Export as CSV
        </button>

        <button
          className={`${styles.exportButton} ${styles.json}`}
          onClick={() => exportData('json')}
          disabled={loading || exporting || gameHistory.length === 0}
        >
          <svg className={styles.icon} viewBox="0 0 24 24" fill="none">
            <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <text x="12" y="16" textAnchor="middle" fontSize="6" fill="currentColor" fontWeight="bold">JSON</text>
          </svg>
          Export as JSON
        </button>

        <button
          className={`${styles.exportButton} ${styles.excel}`}
          onClick={() => exportData('excel')}
          disabled={loading || exporting || gameHistory.length === 0}
        >
          <svg className={styles.icon} viewBox="0 0 24 24" fill="none">
            <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M8 13H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M8 17H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Export as Excel
        </button>
      </div>

      {exporting && (
        <div className={styles.progressContainer}>
          <div className={styles.progressBar}>
            <div 
              className={styles.progressFill} 
              style={{ width: `${exportProgress}%` }}
            />
          </div>
          <p className={styles.progressText}>Exporting... {exportProgress}%</p>
        </div>
      )}

      {gameHistory.length === 0 && !loading && (
        <p className={styles.emptyMessage}>No data available to export</p>
      )}

      <div className={styles.exportInfo}>
        <p className={styles.infoText}>
          📊 {gameHistory.length} games available for export
        </p>
        {statistics && (
          <p className={styles.infoText}>
            💰 Net profit: ${((statistics.totalWinnings || 0) - (statistics.totalSpent || 0)).toFixed(2)}
          </p>
        )}
      </div>
    </div>
  )
}

export default GameHistoryExport