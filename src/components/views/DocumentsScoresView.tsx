import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FileText, Award, Plus, AlertTriangle, Trash2, CheckCircle } from 'lucide-react';
import { DateTime } from 'luxon';
import { useDatabase } from '../../lib/db/context';
import { useToast } from '../ui/ToastContext';
import { Modal } from '../ui/Modal';
import type { Document, TestScore, TestType, Milestone } from '../../lib/db/schema';

export const DocumentsScoresView: React.FC = () => {
  const { repos, version, refresh } = useDatabase();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'documents' | 'scores'>('documents');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [testScores, setTestScores] = useState<TestScore[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);

  // Add Document Modal
  const [isAddDocOpen, setIsAddDocOpen] = useState(false);
  const [docTitle, setDocTitle] = useState('');
  const [docKind, setDocKind] = useState('sop');
  const [docVersion, setDocVersion] = useState('v1.0');
  const [docPath, setDocPath] = useState('');
  const [docNotes, setDocNotes] = useState('');

  // Add Score Modal
  const [isAddScoreOpen, setIsAddScoreOpen] = useState(false);
  const [testType, setTestType] = useState<TestType>('gre');
  const [takenOn, setTakenOn] = useState('2025-08-15');
  const [totalScore, setTotalScore] = useState('328');
  const [validUntil, setValidUntil] = useState('2030-08-15');
  const [sectionsJson, setSectionsJson] = useState('{"Verbal": 160, "Quant": 168, "AWA": 4.5}');
  const [scoreNotes, setScoreNotes] = useState('');

  const loadData = useCallback(async () => {
    if (!repos) return;
    const [docs, scores, ms] = await Promise.all([
      repos.documents.list(),
      repos.testScores.list(),
      repos.milestones.listAll(),
    ]);
    setDocuments(docs);
    setTestScores(scores);
    setMilestones(ms);
  }, [repos]);

  useEffect(() => {
    loadData();
  }, [loadData, version]);

  const latestDeadline = useMemo(() => {
    const appDeadlines = milestones
      .filter((m) => m.kind === 'application')
      .map((m) => m.due_local.slice(0, 10));
    appDeadlines.sort();
    return appDeadlines[appDeadlines.length - 1];
  }, [milestones]);

  const handleAddDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repos || !docTitle.trim() || !docPath.trim()) return;

    await repos.documents.create({
      title: docTitle.trim(),
      kind: docKind,
      version_label: docVersion.trim(),
      file_path: docPath.trim(),
      notes: docNotes.trim(),
    });

    showToast({ message: `Added document reference "${docTitle}".` });
    setDocTitle('');
    setDocPath('');
    setDocNotes('');
    setIsAddDocOpen(false);
    refresh();
  };

  const handleAddScore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repos || !totalScore.trim() || !validUntil.trim()) return;

    await repos.testScores.create({
      test: testType,
      taken_on: takenOn,
      total: totalScore.trim(),
      valid_until: validUntil,
      sections: sectionsJson.trim(),
      notes: scoreNotes.trim(),
    });

    showToast({ message: `Recorded ${testType.toUpperCase()} score.` });
    setIsAddScoreOpen(false);
    refresh();
  };

  const handleDeleteDoc = async (id: string) => {
    if (!repos) return;
    await repos.documents.softDelete(id);
    showToast({ message: 'Removed document.' });
    refresh();
  };

  const handleDeleteScore = async (id: string) => {
    if (!repos) return;
    await repos.testScores.softDelete(id);
    showToast({ message: 'Removed test score.' });
    refresh();
  };

  return (
    <div className="space-y-6">
      {/* Tab toggle and actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex rounded-lg border border-slate-300 bg-slate-100 p-0.5 dark:border-slate-700 dark:bg-slate-800 text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('documents')}
            className={`flex items-center gap-1.5 rounded-md px-3.5 py-1.5 transition-colors ${
              activeTab === 'documents'
                ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-slate-100'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            Documents Library ({documents.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('scores')}
            className={`flex items-center gap-1.5 rounded-md px-3.5 py-1.5 transition-colors ${
              activeTab === 'scores'
                ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-slate-100'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Award className="h-3.5 w-3.5" />
            Official Test Scores ({testScores.length})
          </button>
        </div>

        {activeTab === 'documents' ? (
          <button
            type="button"
            onClick={() => setIsAddDocOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Link Document
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setIsAddScoreOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Record Test Score
          </button>
        )}
      </div>

      {/* Documents View */}
      {activeTab === 'documents' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.length === 0 ? (
            <div className="col-span-full rounded-xl border border-dashed border-slate-200 p-12 text-center text-xs text-slate-400 dark:border-slate-800">
              No document references linked yet. You can keep references to your CV, SOP drafts, and
              transcripts without copying files into the repository.
            </div>
          ) : (
            documents.map((doc) => (
              <div
                key={doc.id}
                className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900"
              >
                <div>
                  <div className="flex justify-between items-start gap-2">
                    <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100">
                      {doc.title}
                    </h4>
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {doc.version_label}
                    </span>
                  </div>

                  <p
                    className="mt-1 text-[11px] text-slate-500 font-mono truncate"
                    title={doc.file_path}
                  >
                    {doc.file_path}
                  </p>

                  {doc.notes && (
                    <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 p-2 rounded">
                      {doc.notes}
                    </p>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800 text-xs">
                  <span className="capitalize text-slate-400 text-[11px]">{doc.kind}</span>
                  <button
                    type="button"
                    onClick={() => handleDeleteDoc(doc.id)}
                    className="text-slate-400 hover:text-rose-600 p-1"
                    aria-label="Delete document"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Test Scores View */}
      {activeTab === 'scores' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {testScores.length === 0 ? (
            <div className="col-span-full rounded-xl border border-dashed border-slate-200 p-12 text-center text-xs text-slate-400 dark:border-slate-800">
              No test scores recorded yet. Add your GRE, TOEFL, or IELTS scores to monitor validity
              expiration against application deadlines.
            </div>
          ) : (
            testScores.map((score) => {
              const isExpired = DateTime.fromISO(score.valid_until) < DateTime.now();
              const expiresBeforeDeadline = latestDeadline && score.valid_until < latestDeadline;

              return (
                <div
                  key={score.id}
                  className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-800 dark:bg-blue-950 dark:text-blue-300 uppercase">
                        {score.test}
                      </span>
                      <p className="mt-1 font-mono text-2xl font-bold text-slate-900 dark:text-slate-100">
                        {score.total}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteScore(score.id)}
                      className="text-slate-400 hover:text-rose-600 p-1"
                      aria-label="Delete test score"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Section breakdown */}
                  {score.sections && score.sections !== '{}' && (
                    <div className="rounded-md bg-slate-50 p-2.5 dark:bg-slate-800 text-xs font-mono text-slate-700 dark:text-slate-300">
                      {score.sections}
                    </div>
                  )}

                  {/* Expiration & Validity */}
                  <div className="border-t border-slate-100 pt-3 dark:border-slate-800 text-xs space-y-1">
                    <div className="flex justify-between text-slate-500">
                      <span>Test Date:</span>
                      <span className="font-mono">{score.taken_on}</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Valid Until:</span>
                      <span className="font-mono">{score.valid_until}</span>
                    </div>

                    {isExpired ? (
                      <div className="flex items-center gap-1.5 text-rose-600 font-semibold text-xs pt-1">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        <span>Score is expired (ETS 5-year validity).</span>
                      </div>
                    ) : expiresBeforeDeadline ? (
                      <div className="flex items-center gap-1.5 text-amber-600 font-semibold text-xs pt-1">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        <span>Warning: Expires before upcoming application deadlines.</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-emerald-600 text-[11px] pt-1">
                        <CheckCircle className="h-3.5 w-3.5" />
                        <span>Valid for all upcoming deadlines</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Add Document Modal */}
      <Modal
        isOpen={isAddDocOpen}
        onClose={() => setIsAddDocOpen(false)}
        title="Link Document Reference"
        description="Save local references to application documents kept on your machine."
        maxWidth="md"
      >
        <form onSubmit={handleAddDocument} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold">Document Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Statement of Purpose (AI / Systems)"
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
              className="mt-1 block w-full rounded border border-slate-300 p-2 dark:border-slate-700 dark:bg-slate-800"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold">Kind</label>
              <select
                value={docKind}
                onChange={(e) => setDocKind(e.target.value)}
                className="mt-1 block w-full rounded border border-slate-300 p-1.5 dark:border-slate-700 dark:bg-slate-800"
              >
                <option value="sop">Statement of Purpose</option>
                <option value="cv">Curriculum Vitae</option>
                <option value="personal_statement">Personal Statement</option>
                <option value="transcript">Transcript</option>
                <option value="writing_sample">Writing Sample</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold">Version Label</label>
              <input
                type="text"
                value={docVersion}
                onChange={(e) => setDocVersion(e.target.value)}
                className="mt-1 block w-full rounded border border-slate-300 p-1.5 dark:border-slate-700 dark:bg-slate-800 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold">Local File Path *</label>
            <input
              type="text"
              required
              placeholder="e.g. C:/Users/Documents/PhD/SOP_v1.pdf"
              value={docPath}
              onChange={(e) => setDocPath(e.target.value)}
              className="mt-1 block w-full rounded border border-slate-300 p-2 font-mono dark:border-slate-700 dark:bg-slate-800"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsAddDocOpen(false)}
              className="rounded border border-slate-300 px-3 py-1.5 text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded bg-blue-600 px-4 py-1.5 font-semibold text-white hover:bg-blue-700"
            >
              Save Document
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Score Modal */}
      <Modal
        isOpen={isAddScoreOpen}
        onClose={() => setIsAddScoreOpen(false)}
        title="Record Test Score"
        description="Record standardized exam scores and track expiry against deadlines."
        maxWidth="md"
      >
        <form onSubmit={handleAddScore} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold">Test</label>
              <select
                value={testType}
                onChange={(e) => setTestType(e.target.value as TestType)}
                className="mt-1 block w-full rounded border border-slate-300 p-1.5 dark:border-slate-700 dark:bg-slate-800"
              >
                <option value="gre">GRE General</option>
                <option value="toefl">TOEFL iBT</option>
                <option value="ielts">IELTS Academic</option>
                <option value="duolingo">Duolingo English Test</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold">Total Score *</label>
              <input
                type="text"
                required
                placeholder="e.g. 328 or 112"
                value={totalScore}
                onChange={(e) => setTotalScore(e.target.value)}
                className="mt-1 block w-full rounded border border-slate-300 p-1.5 font-mono dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold">Test Date</label>
              <input
                type="date"
                required
                value={takenOn}
                onChange={(e) => setTakenOn(e.target.value)}
                className="mt-1 block w-full rounded border border-slate-300 p-1.5 font-mono dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="block font-semibold">Valid Until</label>
              <input
                type="date"
                required
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="mt-1 block w-full rounded border border-slate-300 p-1.5 font-mono dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold">Section Breakdown (JSON or text)</label>
            <input
              type="text"
              value={sectionsJson}
              onChange={(e) => setSectionsJson(e.target.value)}
              className="mt-1 block w-full rounded border border-slate-300 p-1.5 font-mono dark:border-slate-700 dark:bg-slate-800"
            />
          </div>

          <div>
            <label className="block font-semibold">Notes</label>
            <input
              type="text"
              placeholder="e.g. Unofficial score report; official ordered"
              value={scoreNotes}
              onChange={(e) => setScoreNotes(e.target.value)}
              className="mt-1 block w-full rounded border border-slate-300 p-1.5 dark:border-slate-700 dark:bg-slate-800"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsAddScoreOpen(false)}
              className="rounded border border-slate-300 px-3 py-1.5 text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded bg-blue-600 px-4 py-1.5 font-semibold text-white hover:bg-blue-700"
            >
              Save Score
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
