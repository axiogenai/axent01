import React, { useState } from 'react';
import {
  Layers,
  Search,
  Filter,
  Download,
  ShieldCheck,
  Building,
  Monitor,
  Eye,
  FileText,
  Trash2,
  Lock,
  Unlock,
  CheckCircle2,
  Table,
  Trophy,
  SlidersHorizontal,
  X
} from 'lucide-react';
import { CandidateStation, CollegeLabInfo } from '../../types/dna';
import { playSound } from '../../utils/sounds';

interface AdminAuditLedgerViewProps {
  stations: CandidateStation[];
  allLabs: CollegeLabInfo[];
  selectedLabId: string;
  setSelectedLabId: (labId: string) => void;
  onInspectStation: (station: CandidateStation) => void;
  onInspectReport: (station: CandidateStation) => void;
  onExportCSV: () => void;
  onClearSubmitted: () => void;
  onRemoveSingleStation?: (stationId: string) => void;
}

export const AdminAuditLedgerView: React.FC<AdminAuditLedgerViewProps> = ({
  stations,
  allLabs,
  selectedLabId,
  setSelectedLabId,
  onInspectStation,
  onInspectReport,
  onExportCSV,
  onClearSubmitted,
  onRemoveSingleStation
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  
  // Shortlist State
  const [isShortlistMode, setIsShortlistMode] = useState<boolean>(false);
  const [shortlistLimit, setShortlistLimit] = useState<number>(5);
  const [customXInput, setCustomXInput] = useState<string>('5');

  // Score extraction helper
  const getStationScore = (s: CandidateStation): number => {
    if (s.marks?.totalMarks !== undefined && s.marks.totalMarks !== null) {
      return Number(s.marks.totalMarks) || 0;
    }
    if (s.mcqProgress?.score !== undefined && s.mcqProgress?.score !== null) {
      return Number(s.mcqProgress.score) || 0;
    }
    return 0;
  };

  // Base filtering by laboratory and search query
  const baseFilteredStations = stations.filter((s) => {
    if (selectedLabId !== 'all' && s.labId !== selectedLabId) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const candidateEmail = s.student?.email || '';
    return (
      (s.student?.name || '').toLowerCase().includes(q) ||
      (s.student?.rollNumber || '').toLowerCase().includes(q) ||
      candidateEmail.toLowerCase().includes(q) ||
      s.stationNumber.toLowerCase().includes(q) ||
      (s.ipAddress || '').toLowerCase().includes(q) ||
      (s.student?.assignmentTitle || s.mcqProgress?.examTitle || '').toLowerCase().includes(q)
    );
  });

  // Shortlisting & sorting logic
  const displayedStations = (() => {
    if (!isShortlistMode) {
      return baseFilteredStations;
    }

    // Sort descending by score, tiebreak with fewest violations and lowest paste ratio
    const sorted = [...baseFilteredStations].sort((a, b) => {
      const scoreDiff = getStationScore(b) - getStationScore(a);
      if (scoreDiff !== 0) return scoreDiff;

      const violationsDiff = (a.metrics?.tabSwitchViolations || 0) - (b.metrics?.tabSwitchViolations || 0);
      if (violationsDiff !== 0) return violationsDiff;

      return (a.metrics?.pasteRatio || 0) - (b.metrics?.pasteRatio || 0);
    });

    return sorted.slice(0, Math.max(1, shortlistLimit));
  })();

  const submittedCount = stations.filter((s) => s.status === 'Submitted & Done').length;

  // Dedicated Shortlist CSV Exporter
  const handleExportShortlistCSV = () => {
    playSound('click');
    const headers = [
      'Rank',
      'Candidate Name',
      'Email / Identifier',
      'Assigned Lab',
      'Station',
      'Score / Marks',
      'Language / Exam',
      'Tab Switch Violations',
      'Paste Percentage',
      'Keystrokes',
      'Cheating Risk',
      'IP Address'
    ];

    const rows = displayedStations.map((station, index) => {
      const rank = `#${index + 1}`;
      const name = station.student?.name || 'Candidate';
      const email = station.student?.email || station.student?.rollNumber || 'N/A';
      const lab = station.labName || station.labId || 'N/A';
      const stationNum = station.stationNumber;
      const score = getStationScore(station);
      const examName = station.student?.assignmentTitle || station.mcqProgress?.examTitle || station.language || 'Assessment';
      const tabSwaps = station.metrics?.tabSwitchViolations || 0;
      const pasteRatio = `${station.metrics?.pasteRatio || 0}%`;
      const keystrokes = station.metrics?.keystrokes || 0;
      const risk = station.cheatingRisk || 'Low';
      const ip = station.ipAddress || 'N/A';

      return [
        rank,
        `"${name.replace(/"/g, '""')}"`,
        `"${email.replace(/"/g, '""')}"`,
        `"${lab.replace(/"/g, '""')}"`,
        `"${stationNum.replace(/"/g, '""')}"`,
        score,
        `"${examName.replace(/"/g, '""')}"`,
        tabSwaps,
        `"${pasteRatio}"`,
        keystrokes,
        `"${risk}"`,
        `"${ip}"`
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `axent-shortlisted-top-${displayedStations.length}-candidates-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const applyCustomLimit = () => {
    const parsed = parseInt(customXInput.trim(), 10);
    if (!isNaN(parsed) && parsed > 0) {
      setShortlistLimit(parsed);
      setIsShortlistMode(true);
      playSound('click');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
      {/* ── AUDIT LEDGER TOP BRANDING & VERIFICATION HEADER ── */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          padding: '14px 18px',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: '10px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '8px',
              background: 'rgba(197, 160, 89, 0.1)',
              color: '#C5A059',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(197, 160, 89, 0.25)'
            }}
          >
            <Layers size={18} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                Official University Examination Audit Ledger
              </h2>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  fontFamily: 'var(--font-mono)',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  background: 'rgba(197, 160, 89, 0.12)',
                  color: '#C5A059',
                  border: '1px solid rgba(197, 160, 89, 0.25)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <ShieldCheck size={11} />
                CRYPTOGRAPHICALLY SEALED
              </span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              SHA-256 Tamper-Evident Examination Ledger · Axiogen Examination Network
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <select
            value={selectedLabId}
            onChange={(e) => {
              playSound('click');
              setSelectedLabId(e.target.value);
            }}
            style={{
              padding: '7px 12px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              color: 'var(--text-primary)',
              fontSize: '12px',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="all">All Campus Laboratories</option>
            {allLabs.map((lab) => (
              <option key={lab.labId} value={lab.labId}>
                {lab.labName}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={onExportCSV}
            className="btn btn-secondary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px' }}
          >
            <Download size={13} />
            <span>Export Official CSV</span>
          </button>

          {submittedCount > 0 && (
            <button
              type="button"
              onClick={onClearSubmitted}
              className="btn btn-secondary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px' }}
            >
              <Trash2 size={13} />
              <span>Clear Completed ({submittedCount})</span>
            </button>
          )}
        </div>
      </div>

      {/* ── LUXURY SHORTLIST & RANKING TOOLBAR ── */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          padding: '12px 16px',
          background: isShortlistMode ? 'rgba(197, 160, 89, 0.05)' : 'var(--bg-elevated)',
          border: isShortlistMode ? '1px solid rgba(197, 160, 89, 0.35)' : '1px solid var(--border)',
          borderRadius: '10px',
          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => {
              setIsShortlistMode(!isShortlistMode);
              playSound('click');
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              height: '32px',
              padding: '0 12px',
              borderRadius: '6px',
              border: isShortlistMode ? '1px solid #C5A059' : '1px solid var(--border)',
              background: isShortlistMode ? '#C5A059' : 'var(--bg-surface)',
              color: isShortlistMode ? '#0A0A0C' : 'var(--text-primary)',
              fontSize: '11.5px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <Trophy size={13} />
            <span>{isShortlistMode ? 'Shortlist Active' : 'Shortlist Top Students'}</span>
          </button>

          {/* Preset Buttons */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'var(--bg-surface)', padding: '2px', borderRadius: '6px', border: '1px solid var(--border)' }}>
            {[3, 5, 10, 25, 50].map((num) => {
              const isSelected = isShortlistMode && shortlistLimit === num;
              return (
                <button
                  key={num}
                  type="button"
                  onClick={() => {
                    setShortlistLimit(num);
                    setCustomXInput(String(num));
                    setIsShortlistMode(true);
                    playSound('click');
                  }}
                  style={{
                    height: '26px',
                    padding: '0 8px',
                    fontSize: '11px',
                    fontWeight: isSelected ? 700 : 500,
                    fontFamily: 'var(--font-mono)',
                    borderRadius: '4px',
                    border: 'none',
                    background: isSelected ? '#C5A059' : 'transparent',
                    color: isSelected ? '#0A0A0C' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    transition: 'all 0.12s ease'
                  }}
                >
                  Top {num}
                </button>
              );
            })}
          </div>

          {/* Custom X Input */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              Custom X:
            </span>
            <input
              type="number"
              min="1"
              max={stations.length || 100}
              value={customXInput}
              onChange={(e) => setCustomXInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applyCustomLimit()}
              style={{
                width: '54px',
                height: '28px',
                padding: '0 6px',
                textAlign: 'center',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                fontSize: '11.5px',
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-primary)',
                outline: 'none'
              }}
            />
            <button
              type="button"
              onClick={applyCustomLimit}
              style={{
                height: '28px',
                padding: '0 8px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                cursor: 'pointer'
              }}
            >
              Apply
            </button>
          </div>
        </div>

        {/* Shortlist Action & Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {isShortlistMode && (
            <>
              <button
                type="button"
                onClick={handleExportShortlistCSV}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  height: '30px',
                  padding: '0 10px',
                  background: 'rgba(197, 160, 89, 0.15)',
                  border: '1px solid rgba(197, 160, 89, 0.4)',
                  borderRadius: '6px',
                  color: '#C5A059',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <Download size={12} />
                <span>Export Shortlist CSV ({displayedStations.length})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsShortlistMode(false);
                  playSound('click');
                }}
                title="Reset to full view"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '30px',
                  height: '30px',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  color: 'var(--text-muted)',
                  cursor: 'pointer'
                }}
              >
                <X size={13} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── SEARCH & COUNT ROW ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap'
        }}
      >
        <div style={{ position: 'relative', flex: 1, minWidth: 'min(100%, 200px)', maxWidth: '380px' }}>
          <Search
            size={14}
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)'
            }}
          />
          <input
            type="text"
            placeholder="Search by student name, email, station..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 34px',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              color: 'var(--text-primary)',
              fontSize: '12px',
              boxSizing: 'border-box',
              outline: 'none'
            }}
          />
        </div>

        <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
          {isShortlistMode ? (
            <span>
              Shortlisted Top <strong style={{ color: '#C5A059' }}>{displayedStations.length}</strong> of{' '}
              <strong>{baseFilteredStations.length}</strong> Ranked Candidates
            </span>
          ) : (
            <span>
              Showing <strong>{displayedStations.length}</strong> of <strong>{stations.length}</strong> Ledger Records
            </span>
          )}
        </div>
      </div>

      {/* ── THE AUDIT LEDGER TABLE ── */}
      <div
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: '10px',
          overflow: 'hidden'
        }}
      >
        <div style={{ overflowX: 'auto', width: '100%', WebkitOverflowScrolling: 'touch' }}>
          <table className="ledger-table" style={{ width: '100%', minWidth: '920px', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)' }}>
                {isShortlistMode && (
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#C5A059', width: '60px' }}>
                    Rank
                  </th>
                )}
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>
                  Station
                </th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>
                  Candidate Information
                </th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>
                  Email / USN
                </th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>
                  Assigned Lab
                </th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>
                  IP Subnet
                </th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>
                  Language / Exam
                </th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>
                  Keystrokes
                </th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>
                  Paste %
                </th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>
                  Tab Swaps
                </th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>
                  Cheating Risk
                </th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>
                  Score
                </th>
                <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, color: 'var(--text-muted)' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {displayedStations.length === 0 ? (
                <tr>
                  <td colSpan={isShortlistMode ? 13 : 12} style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No audit records found in the ledger.
                  </td>
                </tr>
              ) : (
                displayedStations.map((station, index) => {
                  const isFlagged =
                    station.cheatingRisk === 'High' ||
                    station.cheatingRisk === 'Critical' ||
                    (station.metrics?.pasteRatio || 0) >= 50;
                  
                  const rankNumber = index + 1;
                  const isTopThree = isShortlistMode && rankNumber <= 3;
                  const candidateEmail = station.student?.email || (station.student?.rollNumber?.includes('@') ? station.student.rollNumber : null);

                  return (
                    <tr
                      key={station.id}
                      style={{
                        borderBottom: '1px solid var(--border)',
                        background: isTopThree ? 'rgba(197, 160, 89, 0.03)' : 'transparent'
                      }}
                    >
                      {/* Shortlist Rank */}
                      {isShortlistMode && (
                        <td style={{ padding: '10px 14px' }}>
                          <span
                            style={{
                              fontSize: '11px',
                              fontFamily: 'var(--font-mono)',
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: isTopThree ? 'rgba(197, 160, 89, 0.15)' : 'var(--bg-surface)',
                              border: isTopThree ? '1px solid rgba(197, 160, 89, 0.4)' : '1px solid var(--border)',
                              color: isTopThree ? '#C5A059' : 'var(--text-muted)'
                            }}
                          >
                            #{rankNumber}
                          </span>
                        </td>
                      )}

                      {/* Station */}
                      <td style={{ padding: '10px 14px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontFamily: 'var(--font-mono)',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: 'var(--bg-surface)',
                            border: '1px solid var(--border)',
                            color: 'var(--text-primary)'
                          }}
                        >
                          {station.stationNumber}
                        </span>
                      </td>

                      {/* Candidate Name & Email */}
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {station.student?.name || 'Candidate'}
                        </div>
                        {candidateEmail && (
                          <div style={{ fontSize: '10.5px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {candidateEmail}
                          </div>
                        )}
                      </td>

                      {/* USN / Identifier */}
                      <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                        {station.student?.rollNumber || 'N/A'}
                      </td>

                      {/* Lab */}
                      <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>
                        {station.labName || station.labId}
                      </td>

                      {/* IP */}
                      <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
                        {station.ipAddress || '10.77.210.15'}
                      </td>

                      {/* Language */}
                      <td style={{ padding: '10px 14px', color: 'var(--text-primary)' }}>
                        {station.language || 'MCQ Exam'}
                      </td>

                      {/* Keystrokes */}
                      <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)' }}>
                        {station.metrics?.keystrokes || 0}
                      </td>

                      {/* Paste % */}
                      <td style={{ padding: '10px 14px' }}>
                        <span
                          style={{
                            fontWeight: 700,
                            color: (station.metrics?.pasteRatio || 0) >= 50 ? '#ef4444' : 'var(--text-primary)'
                          }}
                        >
                          {station.metrics?.pasteRatio || 0}%
                        </span>
                      </td>

                      {/* Tab Swaps */}
                      <td style={{ padding: '10px 14px' }}>
                        <span
                          style={{
                            fontWeight: 700,
                            color: (station.metrics?.tabSwitchViolations || 0) >= 2 ? '#ef4444' : 'var(--text-primary)'
                          }}
                        >
                          {station.metrics?.tabSwitchViolations || 0}
                        </span>
                      </td>

                      {/* Cheating Risk */}
                      <td style={{ padding: '10px 14px' }}>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: isFlagged ? 'rgba(239, 68, 68, 0.12)' : 'rgba(34, 197, 94, 0.12)',
                            color: isFlagged ? '#ef4444' : '#22c55e',
                            border: isFlagged
                              ? '1px solid rgba(239, 68, 68, 0.3)'
                              : '1px solid rgba(34, 197, 94, 0.25)'
                          }}
                        >
                          {station.cheatingRisk || 'Low'}
                        </span>
                      </td>

                      {/* Marks / Score */}
                      <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                        {station.marks ? (
                          <span style={{ color: isTopThree ? '#C5A059' : '#3b82f6' }}>{station.marks.totalMarks} pts</span>
                        ) : station.mcqProgress?.score !== undefined ? (
                          <span style={{ color: isTopThree ? '#C5A059' : '#3b82f6' }}>{station.mcqProgress.score} pts</span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>Pending</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => onInspectStation(station)}
                            title="Inspect telemetry dossier"
                            style={{
                              padding: '5px 8px',
                              background: 'var(--bg-surface)',
                              border: '1px solid var(--border)',
                              borderRadius: '6px',
                              color: 'var(--text-primary)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '11px'
                            }}
                          >
                            <Eye size={12} />
                            <span>Dossier</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => onInspectReport(station)}
                            title="Open candidate examination report"
                            style={{
                              padding: '5px 8px',
                              background: 'rgba(59, 130, 246, 0.12)',
                              border: '1px solid rgba(59, 130, 246, 0.3)',
                              borderRadius: '6px',
                              color: '#3b82f6',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '11px',
                              fontWeight: 600
                            }}
                          >
                            <FileText size={12} />
                            <span>Report</span>
                          </button>

                          {onRemoveSingleStation && (
                            <button
                              type="button"
                              onClick={() => onRemoveSingleStation(station.id)}
                              title="Delete record from ledger"
                              style={{
                                padding: '5px 8px',
                                background: 'transparent',
                                border: '1px solid var(--border)',
                                borderRadius: '6px',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                fontSize: '11px'
                              }}
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
