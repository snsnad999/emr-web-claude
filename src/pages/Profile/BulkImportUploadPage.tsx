import { useParams, Navigate } from 'react-router-dom';
import type { BulkImportSection } from '@/types';
import BulkImportUpload from './components/BulkImportUpload';

const VALID_SECTIONS: BulkImportSection[] = [
  'medication',
  'diagnosis',
  'symptom',
  'examination_finding',
  'lab_test',
  'lab_result',
];

export default function BulkImportUploadPage() {
  const { section } = useParams<{ section: string }>();

  if (!section || !VALID_SECTIONS.includes(section as BulkImportSection)) {
    return <Navigate to="/profile/import-data" replace />;
  }

  return <BulkImportUpload sectionKey={section as BulkImportSection} />;
}
