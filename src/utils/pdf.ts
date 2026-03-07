import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import type { MonthlyReport } from '../types';
import { MONTHS } from '../types';

export async function exportReportPDF(
  elementId: string,
  report: MonthlyReport
): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) throw new Error('Report element not found');

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#f1f5f9',
  });

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imgWidth = pageWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  let yPosition = 0;

  // If content is taller than one page, split across pages
  while (yPosition < imgHeight) {
    if (yPosition > 0) {
      pdf.addPage();
    }
    pdf.addImage(
      imgData,
      'PNG',
      0,
      -yPosition,
      imgWidth,
      imgHeight
    );
    yPosition += pageHeight;
  }

  const monthName = MONTHS[report.month - 1];
  const filename = `OTP-Report-${report.melderName.replace(/\s+/g, '-')}-${monthName}-${report.year}.pdf`;
  pdf.save(filename);
}

export async function exportDashboardPDF(elementId: string): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) throw new Error('Dashboard element not found');

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#f1f5f9',
  });

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const imgHeight = (canvas.height * pageWidth) / canvas.width;
  pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, imgHeight);

  pdf.save(`OTP-Dashboard-${new Date().toISOString().slice(0, 10)}.pdf`);
}
