import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Book, FileText, Download, Upload } from 'lucide-react';
import axios from 'axios';

const Dashboard = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [assignments, setAssignments] = useState([]);

  useEffect(() => {
    const fetchMyAssignments = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/student/assignments', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setAssignments(res.data);
      } catch (err) {
        console.error('Failed to load my assignments', err);
      }
    };
    fetchMyAssignments();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleGenerateBarcodePDF = async (assignment) => {
    try {
      const JsBarcode = (await import('jsbarcode')).default;
      const { pdf } = await import('@react-pdf/renderer');
      const BarcodePDF = (await import('../../components/BarcodePDF')).default;

      // 1. Generate Barcode Base64
      const canvas = document.createElement('canvas');
      JsBarcode(canvas, assignment._id, {
        format: 'CODE128',
        displayValue: true,
        fontSize: 16,
        margin: 10,
        width: 2,
        height: 60
      });
      const barcodeDataUrl = canvas.toDataURL('image/png');

      // 2. Generate PDF Blob
      const doc = <BarcodePDF assignment={assignment} barcodeDataUrl={barcodeDataUrl} user={user} />;
      const asPdf = pdf([]);
      asPdf.updateContainer(doc);
      const blob = await asPdf.toBlob();

      // 3. Download
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Barcode_${assignment.subjectId?.subCode}_${user?.regdNo || 'Student'}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error generating PDF', err);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <div className="bg-teal-600 text-white p-2 rounded-lg mr-3">
                <Book className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Student Portal</h1>
                <p className="text-sm text-slate-500 font-medium">{user.fullName} ({user.regdNo})</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center text-slate-500 hover:text-red-600 font-medium px-3 py-2 rounded-lg hover:bg-red-50 transition-colors"
            >
              <LogOut className="h-5 w-5 mr-2" />
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900">My Subjects</h2>
          <p className="text-slate-500 mt-1">Download barcode sheets and upload your completed lab records.</p>
        </div>
        
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-600">
              <thead className="text-xs text-slate-700 uppercase bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="min-w-[10rem] pl-4 sm:pl-6 py-4 font-semibold">Document</th>
                  <th className="hidden sm:table-cell px-6 py-4 font-semibold">Submitted</th>
                  <th className="min-w-[8rem] pr-4 sm:pr-6 sm:text-left py-4 font-semibold">Evaluation</th>
                  <th className="w-[1%] whitespace-nowrap pr-4 text-right sm:pr-6 py-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map(assignment => (
                  <tr key={assignment._id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    
                    <td className="pl-4 sm:pl-6 py-4">
                      <p className="font-semibold text-slate-900">{assignment.groupSubjectName || assignment.subjectId?.subName}</p>
                      <p className="text-xs text-slate-500 mt-1">{assignment.subjectId?.subCode} • {assignment.subjectId?.semester}</p>
                      <div className="mt-2 flex items-center text-xs text-slate-500">
                        <FileText className="h-3 w-3 mr-1" />
                        Requires {assignment.pagesRequired} pages
                      </div>
                    </td>
                    
                    <td className="hidden sm:table-cell px-6 py-4">
                      {assignment.submittedAt ? (
                        <span className="text-slate-700 font-medium">{new Date(assignment.submittedAt).toLocaleDateString()}</span>
                      ) : (
                        <span className="text-slate-400 italic">Not submitted</span>
                      )}
                    </td>
                    
                    <td className="pr-4 sm:pr-6 py-4">
                      <div className="flex flex-col space-y-1">
                        <span className={`inline-flex items-center w-max px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          assignment.status === 'Evaluated' ? 'bg-green-100 text-green-800' : 
                          assignment.status === 'Submitted' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-800'
                        }`}>
                          {assignment.status}
                        </span>
                        {assignment.status === 'Evaluated' && (
                          <span className="text-sm font-semibold text-slate-900">
                            Score: {assignment.score} {assignment.maxMarks ? `/ ${assignment.maxMarks}` : ''}
                          </span>
                        )}
                      </div>
                    </td>
                    
                    <td className="w-[1%] whitespace-nowrap pr-4 text-right sm:pr-6 py-4">
                      <div className="flex flex-col sm:flex-row gap-2 justify-end">
                        <button 
                          onClick={() => handleGenerateBarcodePDF(assignment)}
                          className="flex items-center px-3 py-1.5 border border-slate-300 rounded-md text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
                        >
                          <Download className="h-3 w-3 mr-1.5" />
                          Barcode PDF
                        </button>
                        
                        <button 
                          className={`flex items-center px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                            assignment.status !== 'Pending' 
                              ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                              : 'bg-teal-600 hover:bg-teal-700 text-white'
                          }`}
                          disabled={assignment.status !== 'Pending'}
                        >
                          <Upload className="h-3 w-3 mr-1.5" />
                          {assignment.status !== 'Pending' ? 'Uploaded' : 'Upload Record'}
                        </button>
                      </div>
                    </td>
                    
                  </tr>
                ))}
                {assignments.length === 0 && (
                  <tr>
                    <td colSpan="4" className="text-center py-12 text-slate-500">
                      You have no assigned lab records at the moment.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
