import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { FileQuestion, ArrowLeft } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
      <div className="p-4 rounded-2xl bg-slate-800 text-slate-400 mb-4">
        <FileQuestion className="w-12 h-12" />
      </div>
      <h1 className="text-2xl font-bold text-slate-100">404 — Page Not Found</h1>
      <p className="text-xs text-slate-400 max-w-sm mt-2 mb-6">
        The requested URL path does not exist in the FinLedger-AI portal.
      </p>
      <Link to="/login">
        <Button variant="secondary" leftIcon={<ArrowLeft className="w-4 h-4" />}>
          Return to Portal
        </Button>
      </Link>
    </div>
  );
};
