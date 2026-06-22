import React, { useState } from 'react';
import { jsPDF } from 'jspdf';
import { Employee, TimeRecord, WorkSchedule } from '../types';
import { Calendar, FileDown, Printer, Filter, ShieldAlert, Award, Clock, ArrowUpDown, ChevronDown, CheckCircle2, X } from 'lucide-react';

interface ReportGeneratorProps {
  employees: Employee[];
  records: TimeRecord[];
  schedules: WorkSchedule[];
}

export default function ReportGenerator({ employees, records, schedules }: ReportGeneratorProps) {
  const [filterRole, setFilterRole] = useState<string>('');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [expandedEmployeeId, setExpandedEmployeeId] = useState<string | null>(null);
  const selectedDate = 'geral'; // Static suffix for backup filenames

  // Extract unique roles for filters
  const roles = Array.from(new Set(employees.map(e => e.role)));

  // Helper time difference calculation (returns hours in decimal)
  const calculateTimeDiff = (startStr: string, endStr: string): number => {
    try {
      const [sh, sm] = startStr.split(':').map(Number);
      const [eh, em] = endStr.split(':').map(Number);
      
      const sMins = sh * 60 + sm;
      const eMins = eh * 60 + em;
      
      if (eMins < sMins) {
        // Over midnight shift handling
        return Math.max(0, ((24 * 60 - sMins) + eMins) / 60);
      }
      return Math.max(0, (eMins - sMins) / 60);
    } catch {
      return 0;
    }
  };

  // Helper date-time difference calculation (returns hours in decimal) supporting day crossover
  const calculateDateTimeDiff = (start: TimeRecord, end: TimeRecord): number => {
    try {
      const startStr = `${start.date}T${start.time}:00`;
      const endStr = `${end.date}T${end.time}:00`;
      const startObj = new Date(startStr);
      const endObj = new Date(endStr);
      const diffMs = endObj.getTime() - startObj.getTime();
      if (diffMs <= 0) return 0;
      return diffMs / (1000 * 60 * 60);
    } catch {
      return 0;
    }
  };

  // Helper static calculation of attendance stats of each employee across ALL records
  // We will compile a summary representing:
  // - Total hours worked
  // - Overtime hours (hours exceeding 8h per daily shifts)
  // - Count of Delays (Atrasos - points exceeding schedule start by > 10 mins)
  // - Absences (Faltas - scheduled but no record)
  // - Presença (Presences days)
  
  interface DetailedDelay {
    date: string;
    delayMinutes: number;
    scheduledTime: string;
    actualTime: string;
  }

  interface DailyLog {
    date: string;
    scheduledTime: string;
    entrada: string;
    saidaIntervalo: string;
    retornoIntervalo: string;
    saida: string;
    hoursWorked: number;
  }

  interface EmployeeSummary {
    employee: Employee;
    presentDaysCount: number;
    hoursWorkedDecimal: number;
    overtimeHoursDecimal: number;
    delayCount: number;
    absenceCount: number;
    delays: DetailedDelay[];
    dailyLogs: DailyLog[];
  }

  const activeEmployees = employees.filter(e => e.isActive && (filterRole === '' || e.role === filterRole));

  const summaries: EmployeeSummary[] = activeEmployees.map(emp => {
    // Collect all records of this employee
    const empRecords = records.filter(r => r.employeeId === emp.id);

    // Sort all records chronologically to build accurate shifts with midnight crossover
    const sortedRecs = [...empRecords].sort((a, b) => {
      const tsA = `${a.date}T${a.time}`;
      const tsB = `${b.date}T${b.time}`;
      return tsA.localeCompare(tsB);
    });

    interface AssignedRecord {
      record: TimeRecord;
      assignedDate: string;
    }

    const assignedRecs: AssignedRecord[] = [];
    let currentEntrada: TimeRecord | null = null;

    sortedRecs.forEach(rec => {
      let assignedDate = rec.date;

      if (rec.type === 'Entrada') {
        currentEntrada = rec;
        assignedDate = rec.date;
      } else {
        if (currentEntrada) {
          try {
            const startObj = new Date(`${currentEntrada.date}T${currentEntrada.time}:00`);
            const endObj = new Date(`${rec.date}T${rec.time}:00`);
            const diffHours = (endObj.getTime() - startObj.getTime()) / (1000 * 60 * 60);

            // If the punch is within a reasonable window (e.g., 20 hours) and positive
            if (diffHours >= 0 && diffHours <= 20) {
              assignedDate = currentEntrada.date;
            } else {
              currentEntrada = null;
            }
          } catch {
            currentEntrada = null;
          }
        }
      }

      assignedRecs.push({
        record: rec,
        assignedDate
      });
    });

    const presentDates = new Set<string>();
    const recsByAssignedDate: { [date: string]: AssignedRecord[] } = {};

    assignedRecs.forEach(ar => {
      presentDates.add(ar.assignedDate);
      if (!recsByAssignedDate[ar.assignedDate]) {
        recsByAssignedDate[ar.assignedDate] = [];
      }
      recsByAssignedDate[ar.assignedDate].push(ar);
    });

    const hoursByDate: { [date: string]: number } = {};

    Object.keys(recsByAssignedDate).forEach(dateStr => {
      const dayAssigned = recsByAssignedDate[dateStr];
      const entAr = dayAssigned.find(ar => ar.record.type === 'Entrada');
      const iniAr = dayAssigned.find(ar => ar.record.type === 'Início Intervalo');
      const retAr = dayAssigned.find(ar => ar.record.type === 'Retorno Intervalo');
      const sdaAr = dayAssigned.find(ar => ar.record.type === 'Saída');

      let dayHours = 0;

      if (entAr && sdaAr) {
        const entTime = new Date(`${entAr.record.date}T${entAr.record.time}:00`).getTime();
        const sdaTime = new Date(`${sdaAr.record.date}T${sdaAr.record.time}:00`).getTime();
        let diffMs = sdaTime - entTime;

        if (iniAr && retAr) {
          const iniTime = new Date(`${iniAr.record.date}T${iniAr.record.time}:00`).getTime();
          const retTime = new Date(`${retAr.record.date}T${retAr.record.time}:00`).getTime();
          if (retTime > iniTime && iniTime > entTime && sdaTime > retTime) {
            const breakMs = retTime - iniTime;
            diffMs -= breakMs;
          }
        }
        dayHours = diffMs / (1000 * 60 * 60);
      } else if (entAr && iniAr) {
        const entTime = new Date(`${entAr.record.date}T${entAr.record.time}:00`).getTime();
        const iniTime = new Date(`${iniAr.record.date}T${iniAr.record.time}:00`).getTime();
        dayHours = (iniTime - entTime) / (1000 * 60 * 60);
        if (retAr) {
          dayHours += 4.0;
        }
      } else if (entAr) {
        dayHours = 4.0;
      }

      hoursByDate[dateStr] = Math.max(0, parseFloat(dayHours.toFixed(2)));
    });

    let totalHours = 0;
    let totalOvertime = 0;

    Object.keys(hoursByDate).forEach(dateStr => {
      const dayWorkedHours = hoursByDate[dateStr];
      totalHours += dayWorkedHours;
      if (dayWorkedHours > 8.0) {
        totalOvertime += (dayWorkedHours - 8.0);
      }
    });

    // Calculate delay (Atraso) based on Entrada records compared to matched scheduled shift
    const detailedDelays: DetailedDelay[] = [];

    empRecords.forEach(rec => {
      if (rec.type === 'Entrada') {
        try {
          const punchDateObj = new Date(`${rec.date}T${rec.time}:00`);
          
          // Find all schedules assigned to this employee
          const empSchedules = schedules.filter(s => s.employeeIds.includes(emp.id));
          
          // Find the schedule whose startTime is closest to the punch time (within a 12-hour window)
          let matchedSchedule: WorkSchedule | null = null;
          let minDiffHrs = Infinity;
          
          empSchedules.forEach(s => {
            const schDateObj = new Date(`${s.date}T${s.startTime}:00`);
            const diffMs = punchDateObj.getTime() - schDateObj.getTime();
            const diffHours = diffMs / (1000 * 60 * 60);
            
            // Check if punch is within -4 hours (early) to +12 hours (late) of scheduled start
            if (diffHours >= -4 && diffHours <= 12) {
              const absDiff = Math.abs(diffHours);
              if (absDiff < minDiffHrs) {
                minDiffHrs = absDiff;
                matchedSchedule = s;
              }
            }
          });
          
          if (matchedSchedule) {
            const sObj = new Date(`${(matchedSchedule as WorkSchedule).date}T${(matchedSchedule as WorkSchedule).startTime}:00`);
            const diffMs = punchDateObj.getTime() - sObj.getTime();
            const diffMinutes = Math.floor(diffMs / (1000 * 60));
            
            // If they checked in more than 10 minutes past the scheduled start time
            if (diffMinutes > 10) {
              detailedDelays.push({
                date: rec.date,
                delayMinutes: diffMinutes,
                scheduledTime: (matchedSchedule as WorkSchedule).startTime,
                actualTime: rec.time
              });
            }
          } else {
            // Fallback: check if there's any schedule on exact date
            const daySchedule = schedules.find(s => s.date === rec.date && s.employeeIds.includes(emp.id));
            if (daySchedule) {
              const [sh, sm] = daySchedule.startTime.split(':').map(Number);
              const [eh, em] = rec.time.split(':').map(Number);
              const diffMinutes = (eh * 60 + em) - (sh * 60 + sm);
              if (diffMinutes > 10) {
                detailedDelays.push({
                  date: rec.date,
                  delayMinutes: diffMinutes,
                  scheduledTime: daySchedule.startTime,
                  actualTime: rec.time
                });
              }
            }
          }
        } catch {
          const daySchedule = schedules.find(s => s.date === rec.date && s.employeeIds.includes(emp.id));
          if (daySchedule) {
            try {
              const [sh, sm] = daySchedule.startTime.split(':').map(Number);
              const [eh, em] = rec.time.split(':').map(Number);
              const diffMinutes = (eh * 60 + em) - (sh * 60 + sm);
              if (diffMinutes > 10) {
                detailedDelays.push({
                  date: rec.date,
                  delayMinutes: diffMinutes,
                  scheduledTime: daySchedule.startTime,
                  actualTime: rec.time
                });
              }
            } catch {}
          }
        }
      }
    });

    // Absences (Faltas) = How many schedules of this employee on dates <= today date have zero records
    const todayStr = (() => {
      const d = new Date();
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    })();
    const pastOrCurrSchedules = schedules.filter(s => s.employeeIds.includes(emp.id) && s.date <= todayStr);
    let absences = 0;
    pastOrCurrSchedules.forEach(sch => {
      const recordsOnSchDate = records.filter(r => r.employeeId === emp.id && r.date === sch.date);
      if (recordsOnSchDate.length === 0) {
        absences++;
      }
    });

    // Collect daily logs with scheduled and recorded times
    const schedDates = schedules.filter(s => s.employeeIds.includes(emp.id)).map(s => s.date);
    const recordDates = Object.keys(recsByAssignedDate);
    const allUniqueDates = Array.from(new Set([...schedDates, ...recordDates])).sort();

    const dailyLogs: DailyLog[] = allUniqueDates.map(dateStr => {
      const daySchedule = schedules.find(s => s.date === dateStr && s.employeeIds.includes(emp.id));
      const scheduledTime = daySchedule ? `${daySchedule.startTime} - ${daySchedule.endTime}` : 'Folga';
      
      const dayAssigned = recsByAssignedDate[dateStr] || [];
      
      const entrada = dayAssigned.find(ar => ar.record.type === 'Entrada')?.record.time || '--:--';
      const saidaIntervalo = dayAssigned.find(ar => ar.record.type === 'Início Intervalo')?.record.time || '--:--';
      const retornoIntervalo = dayAssigned.find(ar => ar.record.type === 'Retorno Intervalo')?.record.time || '--:--';
      const saida = dayAssigned.find(ar => ar.record.type === 'Saída')?.record.time || '--:--';
      
      const dayWorkedHours = hoursByDate[dateStr] || 0;
      
      return {
        date: dateStr,
        scheduledTime,
        entrada,
        saidaIntervalo,
        retornoIntervalo,
        saida,
        hoursWorked: parseFloat(dayWorkedHours.toFixed(1))
      };
    });

    return {
      employee: emp,
      presentDaysCount: presentDates.size,
      hoursWorkedDecimal: parseFloat(totalHours.toFixed(1)),
      overtimeHoursDecimal: parseFloat(totalOvertime.toFixed(1)),
      delayCount: detailedDelays.length,
      absenceCount: absences,
      delays: detailedDelays,
      dailyLogs
    };
  });

  // Calculate high level totals
  const totalHoursWorkedAll = summaries.reduce((acc, curr) => acc + curr.hoursWorkedDecimal, 0);
  const totalOvertimeAll = summaries.reduce((acc, curr) => acc + curr.overtimeHoursDecimal, 0);
  const totalDelaysAll = summaries.reduce((acc, curr) => acc + curr.delayCount, 0);
  const totalAbsencesAll = summaries.reduce((acc, curr) => acc + curr.absenceCount, 0);

  // CSV Exporter
  const handleExportCSV = () => {
    let headers = 'ID,Nome Completo,Funçao,Dias Presentes,Horas Trabalhadas,Horas Extras,Quantidade de Atrasos,Faltas\n';
    let rows = summaries.map(sum => (
      `"${sum.employee.id}","${sum.employee.fullName}","${sum.employee.role}",${sum.presentDaysCount},${sum.hoursWorkedDecimal},${sum.overtimeHoursDecimal},${sum.delayCount},${sum.absenceCount}`
    )).join('\n');

    const combinedCsv = headers + rows;
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), combinedCsv], { type: 'text/csv;charset=utf-8;' }); // UTF-8 BOM representation
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `relatorio_ponto_arraia_cozinha_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Printing Layout trigger
  const handlePrint = () => {
    setIsPrintModalOpen(true);
  };

  // Direct jsPDF Exporter
  const handleExportPDF = () => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const margin = 15;
    const contentWidth = 267;
    
    let currentY = 36; // Start below header region

    // 1. Draw top stats scorecard on the first page
    const boxWidth = 63;
    const boxHeight = 15;
    const boxY = 36;
    const spacing = 5;

    // Box 1
    doc.setDrawColor(29, 27, 32);
    doc.setLineWidth(0.4);
    doc.setFillColor(255, 255, 255);
    doc.rect(15, boxY, boxWidth, boxHeight, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 100, 100);
    doc.text('HORAS TRABALHADAS ACUM.', 15 + 4, boxY + 5.5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(34, 112, 147); // Blue
    doc.text(`${totalHoursWorkedAll.toFixed(1)}h`, 15 + 4, boxY + 12);

    // Box 2
    doc.rect(15 + boxWidth + spacing, boxY, boxWidth, boxHeight, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 100, 100);
    doc.text('HORAS EXTRAS (>8H DIA/TURNO)', 15 + boxWidth + spacing + 4, boxY + 5.5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(195, 74, 44); // Red
    doc.text(`${totalOvertimeAll.toFixed(1)}h`, 15 + boxWidth + spacing + 4, boxY + 12);

    // Box 3
    doc.rect(15 + (boxWidth + spacing) * 2, boxY, boxWidth, boxHeight, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 100, 100);
    doc.text('ATRASOS DE ESCALA (>10 MIN)', 15 + (boxWidth + spacing) * 2 + 4, boxY + 5.5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(195, 74, 44); // Red
    doc.text(`${totalDelaysAll}`, 15 + (boxWidth + spacing) * 2 + 4, boxY + 12);

    // Box 4
    doc.rect(15 + (boxWidth + spacing) * 3, boxY, boxWidth, boxHeight, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 100, 100);
    doc.text('FALTAS ACUMULADAS/AUSÊNCIAS', 15 + (boxWidth + spacing) * 3 + 4, boxY + 5.5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(120, 120, 120); // Dark grey
    doc.text(`${totalAbsencesAll}`, 15 + (boxWidth + spacing) * 3 + 4, boxY + 12);

    // Move table Y below scorecards
    currentY = 56;

    // Draw Table Headings on Page
    const drawTableHeadings = (y: number) => {
      doc.setFillColor(243, 244, 246);
      doc.rect(15, y, 267, 8, 'F');
      
      doc.setDrawColor(29, 27, 32);
      doc.setLineWidth(0.4);
      doc.line(15, y, 282, y);
      doc.line(15, y + 8, 282, y + 8);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(29, 27, 32);

      doc.text('PROFISSIONAL / CONTATO', 15 + 3, y + 5.5);
      doc.text('FUNÇÃO', 70 + 3, y + 5.5);
      doc.text('DIAS ATIV.', 110 + 10, y + 5.5, { align: 'center' });
      doc.text('H. TRAB.', 130 + 12.5, y + 5.5, { align: 'center' });
      doc.text('H. EXTRAS', 155 + 12.5, y + 5.5, { align: 'center' });
      doc.text('ATRASOS', 180 + 10, y + 5.5, { align: 'center' });
      doc.text('DETALHAMENTO DOS ATRASOS', 200 + 3, y + 5.5);
      doc.text('FALTAS', 247 + 10, y + 5.5, { align: 'center' });
    };

    drawTableHeadings(currentY);
    currentY += 8;

    let rowIndex = 0;

    const getRowHeight = (sum: EmployeeSummary) => {
      const delaysCount = sum.delays.length;
      if (delaysCount <= 1) return 10;
      return 6 + delaysCount * 3.5;
    };

    // 2. Render each active employee row
    summaries.forEach((sum) => {
      const rowHeight = getRowHeight(sum);
      
      // Check if we exceed page height (Y=185 for safety)
      if (currentY + rowHeight > 185) {
        doc.addPage();
        currentY = 38; // space on Page 2+ starting lower than header bar
        drawTableHeadings(currentY);
        currentY += 8;
      }

      // Background color
      if (rowIndex % 2 === 0) {
        doc.setFillColor(253, 252, 248);
      } else {
        doc.setFillColor(255, 255, 255);
      }
      doc.rect(15, currentY, 267, rowHeight, 'F');

      // Bottom solid divider line
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.2);
      doc.line(15, currentY + rowHeight, 282, currentY + rowHeight);

      // Columns grids
      doc.setDrawColor(210, 210, 210);
      doc.line(70, currentY, 70, currentY + rowHeight);
      doc.line(110, currentY, 110, currentY + rowHeight);
      doc.line(130, currentY, 130, currentY + rowHeight);
      doc.line(155, currentY, 155, currentY + rowHeight);
      doc.line(180, currentY, 180, currentY + rowHeight);
      doc.line(200, currentY, 200, currentY + rowHeight);
      doc.line(247, currentY, 247, currentY + rowHeight);

      // Text content
      doc.setTextColor(29, 27, 32);
      
      // Employee Name & Phone
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.text(sum.employee.fullName, 15 + 3, currentY + 4.5);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(110, 110, 110);
      doc.text(sum.employee.phone || 'Sem contato', 15 + 3, currentY + 7.5);

      // Role
      doc.setTextColor(29, 27, 32);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.text(sum.employee.role, 70 + 3, currentY + 5.5);

      // Present Days
      doc.setFont('helvetica', 'bold');
      doc.text(`${sum.presentDaysCount}`, 110 + 10, currentY + 5.5, { align: 'center' });

      // Hours worked
      doc.setTextColor(34, 112, 147);
      doc.text(`${sum.hoursWorkedDecimal}h`, 130 + 12.5, currentY + 5.5, { align: 'center' });

      // Overtime
      if (sum.overtimeHoursDecimal > 0) {
        doc.setTextColor(195, 74, 44);
      } else {
        doc.setTextColor(120, 120, 120);
      }
      doc.text(`${sum.overtimeHoursDecimal}h`, 155 + 12.5, currentY + 5.5, { align: 'center' });

      // Delays count
      if (sum.delayCount > 0) {
        doc.setTextColor(195, 74, 44);
      } else {
        doc.setTextColor(120, 120, 120);
      }
      doc.text(`${sum.delayCount}`, 180 + 10, currentY + 5.5, { align: 'center' });

      // Delays list
      if (sum.delays.length > 0) {
        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(195, 74, 44);
        sum.delays.forEach((del, dIdx) => {
          const dateFormatted = del.date.split('-').reverse().slice(0, 2).join('/');
          doc.text(`• ${dateFormatted}: +${del.delayMinutes}m (Escala: ${del.scheduledTime})`, 200 + 3, currentY + 4 + dIdx * 3.5);
        });
      } else {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(7);
        doc.setTextColor(160, 160, 160);
        doc.text('Nenhum atraso', 200 + 3, currentY + 5.5);
      }

      // Absences
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      if (sum.absenceCount > 0) {
        doc.setTextColor(195, 74, 44);
      } else {
        doc.setTextColor(120, 120, 120);
      }
      doc.text(`${sum.absenceCount}`, 247 + 10, currentY + 5.5, { align: 'center' });

      currentY += rowHeight;
      rowIndex++;
    });

    // Draw Table Total Footer Row
    const totalRowHeight = 8;
    if (currentY + totalRowHeight > 185) {
      doc.addPage();
      currentY = 38;
      drawTableHeadings(currentY);
      currentY += 8;
    }

    doc.setFillColor(240, 240, 240);
    doc.rect(15, currentY, 267, totalRowHeight, 'F');
    
    doc.setDrawColor(29, 27, 32);
    doc.setLineWidth(0.4);
    doc.line(15, currentY, 282, currentY);
    doc.line(15, currentY + totalRowHeight, 282, currentY + totalRowHeight);

    // Draw grid lines for footer row
    doc.setDrawColor(210, 210, 210);
    doc.line(70, currentY, 70, currentY + totalRowHeight);
    doc.line(110, currentY, 110, currentY + totalRowHeight);
    doc.line(130, currentY, 130, currentY + totalRowHeight);
    doc.line(155, currentY, 155, currentY + totalRowHeight);
    doc.line(180, currentY, 180, currentY + totalRowHeight);
    doc.line(200, currentY, 200, currentY + totalRowHeight);
    doc.line(247, currentY, 247, currentY + totalRowHeight);

    doc.setTextColor(29, 27, 32);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('TOTAL CONSOLIDADO', 15 + 3, currentY + 5);

    doc.text(`${summaries.reduce((acc, curr) => acc + curr.presentDaysCount, 0)}`, 110 + 10, currentY + 5, { align: 'center' });

    // Total Hours
    doc.setTextColor(34, 112, 147);
    doc.text(`${totalHoursWorkedAll.toFixed(1)}h`, 130 + 12.5, currentY + 5, { align: 'center' });

    // Total Overtime
    doc.setTextColor(195, 74, 44);
    doc.text(`${totalOvertimeAll.toFixed(1)}h`, 155 + 12.5, currentY + 5, { align: 'center' });

    // Total delays
    doc.setTextColor(195, 74, 44);
    doc.text(`${totalDelaysAll}`, 180 + 10, currentY + 5, { align: 'center' });

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6.5);
    doc.setTextColor(120, 120, 120);
    doc.text('Soma consolidada da equipe', 200 + 3, currentY + 5);

    // Total absences
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(120, 120, 120);
    doc.text(`${totalAbsencesAll}`, 247 + 10, currentY + 5, { align: 'center' });

    currentY += totalRowHeight;

    // 3. Footer notes & Signatures block
    if (currentY + 25 > 195) {
      doc.addPage();
      currentY = 38;
    }

    // Draw Footer & Notes
    const footerY = currentY + 4;
    doc.setDrawColor(29, 27, 32);
    doc.setLineWidth(0.4);
    doc.line(15, footerY, 282, footerY);

    const finalNotesY = footerY + 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(29, 27, 32);
    doc.text('NOTAS ADMINISTRATIVAS:', 15 + 3, finalNotesY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(80, 80, 80);
    const noteLine1 = 'Consolidado oficial de presenca de profissionais de cozinha contratados para o Arraia Fibra Forte.';
    const noteLine2 = 'As horas computam repousos legais e tolerancias sindicais aplicaveis de ate 10 minutos por turno.';
    doc.text(noteLine1, 15 + 3, finalNotesY + 3.5);
    doc.text(noteLine2, 15 + 3, finalNotesY + 7);

    // Signatures on right
    const sigX = 180;
    doc.setDrawColor(29, 27, 32);
    doc.setLineWidth(0.5);
    doc.line(sigX, finalNotesY + 9, sigX + 90, finalNotesY + 9);
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(29, 27, 32);
    doc.text('ASSINATURA DO RESPONSÁVEL', sigX + 45, finalNotesY + 12.5, { align: 'center' });
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(130, 130, 130);
    doc.text('Controle de Ponto Cozinha - Arraia Fibra Forte', sigX + 45, finalNotesY + 15.5, { align: 'center' });

    // 3.5. Generate Individual Official Timesheets for each employee on new pages (with exact hour punch details)
    summaries.forEach((sum) => {
      doc.addPage();
      
      let yy = 36;
      
      // A. Profile Box Header
      doc.setFillColor(248, 246, 240); // Soft beige theme background
      doc.setDrawColor(29, 27, 32);
      doc.setLineWidth(0.4);
      doc.rect(15, yy, 267, 18, 'FD');
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(29, 27, 32);
      doc.text(`FOLHA DE APURAÇÃO INDIVIDUAL: ${sum.employee.fullName.toUpperCase()}`, 15 + 4, yy + 5.5);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(80, 80, 80);
      doc.text(`Função: ${sum.employee.role}`, 15 + 4, yy + 10);
      doc.text(`Contato: ${sum.employee.phone || 'Sem contato'}`, 15 + 100, yy + 10);
      doc.text(`Admissão: ${sum.employee.admissionDate?.split('-').reverse().join('/') || 'Sem cadastro'}`, 15 + 180, yy + 10);
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.text(`Total de Horas Trabalhadas: ${sum.hoursWorkedDecimal.toFixed(1)}h`, 15 + 4, yy + 14.5);
      doc.text(`Total de Horas Extras: ${sum.overtimeHoursDecimal.toFixed(1)}h`, 15 + 100, yy + 14.5);
      doc.text(`Atrasos: ${sum.delayCount} ocorrência(s)`, 15 + 180, yy + 14.5);
      
      yy += 23; // Distance below profile header info
      
      // B. Table Daily Records Header
      doc.setFillColor(240, 240, 240);
      doc.rect(15, yy, 267, 7, 'F');
      
      doc.setDrawColor(29, 27, 32);
      doc.setLineWidth(0.4);
      doc.line(15, yy, 282, yy);
      doc.line(15, yy + 7, 282, yy + 7);
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(29, 27, 32);
      
      doc.text('DATA', 15 + 3, yy + 5);
      doc.text('JORNADA PREVISTA', 45, yy + 5);
      doc.text('ENTRADA (CHECK-IN)', 95, yy + 5);
      doc.text('ALMOÇO INÍCIO', 135, yy + 5);
      doc.text('ALMOÇO RETORNO', 175, yy + 5);
      doc.text('SAÍDA (CHECK-OUT)', 215, yy + 5);
      doc.text('TOTAL HORAS', 255, yy + 5);
      
      yy += 7;
      
      // C. List daily logs
      sum.dailyLogs.forEach((log, lIdx) => {
        // If we exceed printable table area (e.g. yy > 155), insert new page
        if (yy > 155) {
          doc.addPage();
          yy = 36;
          // Redraw Table Header
          doc.setFillColor(240, 240, 240);
          doc.rect(15, yy, 267, 7, 'F');
          doc.setDrawColor(29, 27, 32);
          doc.setLineWidth(0.4);
          doc.line(15, yy, 282, yy);
          doc.line(15, yy + 7, 282, yy + 7);
          
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7);
          doc.setTextColor(29, 27, 32);
          doc.text('DATA', 15 + 3, yy + 5);
          doc.text('JORNADA PREVISTA', 45, yy + 5);
          doc.text('ENTRADA', 95, yy + 5);
          doc.text('ALMOÇO INÍCIO', 135, yy + 5);
          doc.text('ALMOÇO RETORNO', 175, yy + 5);
          doc.text('SAÍDA', 215, yy + 5);
          doc.text('TOTAL HORAS', 255, yy + 5);
          yy += 7;
        }
        
        // Row background alternating
        if (lIdx % 2 === 0) {
          doc.setFillColor(252, 252, 252);
        } else {
          doc.setFillColor(255, 255, 255);
        }
        doc.rect(15, yy, 267, 6, 'F');
        
        // Split row borders
        doc.setDrawColor(230, 230, 230);
        doc.setLineWidth(0.15);
        doc.line(15, yy + 6, 282, yy + 6);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(29, 27, 32);
        
        const dateFormatted = log.date.split('-').reverse().join('/');
        doc.text(dateFormatted, 15 + 3, yy + 4.2);
        doc.text(log.scheduledTime, 45, yy + 4.2);
        
        doc.setFont('helvetica', log.entrada !== '--:--' ? 'bold' : 'normal');
        doc.text(log.entrada, 95, yy + 4.2);
        doc.text(log.saidaIntervalo, 135, yy + 4.2);
        doc.text(log.retornoIntervalo, 175, yy + 4.2);
        doc.text(log.saida, 215, yy + 4.2);
        
        doc.setFont('helvetica', 'bold');
        if (log.hoursWorked > 0) {
          doc.setTextColor(34, 112, 147); // Blue
          doc.text(`${log.hoursWorked.toFixed(1)}h`, 255, yy + 4.2);
        } else {
          doc.setTextColor(150, 150, 150);
          doc.text('Folga/Aus.', 255, yy + 4.2);
        }
        
        yy += 6;
      });
      
      // Individual Summary Table Total Row
      doc.setFillColor(242, 244, 246);
      doc.rect(15, yy, 267, 6, 'F');
      
      doc.setDrawColor(29, 27, 32);
      doc.setLineWidth(0.4);
      doc.line(15, yy, 282, yy);
      doc.line(15, yy + 6, 282, yy + 6);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(29, 27, 32);
      doc.text('TOTAL DE HORAS TRABALHADAS ACUMULADO', 15 + 3, yy + 4.2);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(34, 112, 147); // Neat blue color for hour numbers
      doc.text(`${sum.hoursWorkedDecimal.toFixed(1)}h`, 255, yy + 4.2);
      
      yy += 6;
      
      const sigBlockY = Math.max(yy + 8, 160); // Align perfectly near bottom (before border line at 195)
      
      doc.setDrawColor(29, 27, 32);
      doc.setLineWidth(0.35);
      doc.line(15, sigBlockY - 2, 282, sigBlockY - 2);
      
      // Dec statement
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(5.5);
      doc.setTextColor(110, 110, 110);
      const declaration = "Declaro para os devidos fins legais que as marcacoes de entrada, intervalo e saida registradas acima refletem com exatidao e fidelidade as horas trabalhadas.";
      doc.text(declaration, 15 + 3, sigBlockY + 2);
      
      // Signature lines
      const lineY = sigBlockY + 12;
      doc.setLineWidth(0.4);
      doc.line(20, lineY, 110, lineY);
      doc.line(170, lineY, 260, lineY);
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(29, 27, 32);
      doc.text(`ASSINATURA DE: ${sum.employee.fullName.toUpperCase()}`, 65, lineY + 3.5, { align: 'center' });
      doc.text('ASSINATURA DA CHEFE DO SETOR', 215, lineY + 3.5, { align: 'center' });
    });

    // 4. SECOND-PASS: Draw Borders and Headers for all pages with exact total count
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      
      // Page border
      doc.setDrawColor(29, 27, 32);
      doc.setLineWidth(0.6);
      doc.rect(15, 15, 267, 180);

      // Header background bar block
      doc.setFillColor(248, 246, 240);
      doc.rect(15, 15, 267, 18, 'F');
      doc.line(15, 33, 282, 33);

      // Accent bar
      doc.setFillColor(195, 74, 44); // Bento Red
      doc.rect(15, 15, 8, 18, 'F');
      doc.line(23, 15, 23, 33);

      // Title
      doc.setTextColor(29, 27, 32);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('ARRAIÁ FIBRA FORTE  •  ESPELHO DE PONTO OFICIAL', 26, 21.5);

      // Subtitle
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 100, 100);
      doc.text('Várzea Nova 2026, Kel controle de ponto', 26, 28.5);

      // Page count & date
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(29, 27, 32);
      const dateFormatted = new Date().toLocaleDateString('pt-BR');
      const timeFormatted = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      doc.text(`Gerado em: ${dateFormatted} às ${timeFormatted}`, 279, 21.5, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      doc.text(`Página ${i} de ${totalPages}`, 279, 28.5, { align: 'right' });
    }

    // 5. Save the generated PDF report
    const cleanFilterSuffix = filterRole ? `_${filterRole.toLowerCase().replace(/\s+/g, '_')}` : '';
    doc.save(`espelho_ponto_arraia_cozinha${cleanFilterSuffix}.pdf`);
  };

  return (
    <>
      <div className="space-y-6 report-screen-content text-bento-navy">
      
      {/* Title block & Actions panel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-[32px] border-2 border-b-8 border-r-8 border-bento-navy shadow-[4px_4px_0px_#1D1B20]">
        <div>
          <h2 className="text-xl font-display font-black uppercase tracking-tight">
            Painel de Relatórios Consolidados
          </h2>
          <p className="text-xs text-stone-500 font-medium">
            Gere relatórios detalhados contendo horas registradas, adicionais noturnos/extras, atrasos da marmita e faltas acumuladas no evento.
          </p>
        </div>

        {/* Action Button exports */}
        <div className="flex flex-wrap gap-2.5 self-start">
          <button
            id="btn-export-csv"
            onClick={handleExportCSV}
            className="px-4.5 py-3 bg-white border-2 border-bento-navy hover:bg-stone-100 text-bento-navy text-xs font-black rounded-2xl transition-all cursor-pointer flex items-center space-x-2 shadow-[2px_2px_0_#1d1b20]"
          >
            <FileDown className="w-4 h-4 text-bento-blue" />
            <span>Exportar Excel (CSV)</span>
          </button>

          <button
            id="btn-preview-print"
            onClick={handlePrint}
            className="px-4.5 py-3 bg-white border-2 border-bento-navy text-bento-navy hover:bg-stone-100 text-xs font-black rounded-2xl transition-all cursor-pointer flex items-center space-x-2 shadow-[2px_2px_0_#1d1b20]"
          >
            <Printer className="w-4 h-4 text-bento-navy" />
            <span>Visualizar Impressão</span>
          </button>
          
          <button
            id="btn-export-pdf-direct"
            onClick={handleExportPDF}
            className="px-4.5 py-3 bg-bento-red hover:bg-rose-600 text-white text-xs font-black rounded-2xl transition-all cursor-pointer flex items-center space-x-2 border-b-4 border-r-4 border-bento-navy shadow-md hover:translate-y-[-1px] active:translate-y-[1px]"
          >
            <FileDown className="w-4 h-4 text-white animate-pulse" />
            <span>Exportar PDF Oficial (jsPDF)</span>
          </button>
        </div>
      </div>

      {/* Quick filters selection */}
      <div className="bg-white border-2 border-b-8 border-r-8 border-bento-navy rounded-[32px] p-5 flex flex-wrap gap-4 items-center shadow-[4px_4px_0px_#1D1B20]">
        <span className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5 border-r-2 border-dashed border-stone-200 pr-4">
          <Filter className="w-4 h-4 text-bento-red" />
          <span>Filtros do Relatório</span>
        </span>

        {/* Select Role */}
        <div className="flex items-center space-x-2 bg-bento-bg px-3.5 py-1.5 rounded-2xl border-2 border-bento-navy">
          <span className="text-[10px] uppercase font-black text-stone-500">Função:</span>
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="bg-transparent text-xs text-bento-navy font-black focus:outline-none cursor-pointer"
          >
            <option value="">Todas as Funções</option>
            {roles.map(role => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Aggregate metrics scoreboard */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white border-2 border-b-8 border-r-8 border-bento-navy p-4.5 rounded-[24px] shadow-[4px_4px_0_#1d1b20]">
          <span className="text-[10px] text-stone-500 font-extrabold uppercase block tracking-wider">Total Horas</span>
          <p className="text-3xl font-display font-black text-bento-navy mt-1.5 font-mono">
            {totalHoursWorkedAll.toFixed(1)}h
          </p>
        </div>

        <div className="bg-white border-2 border-b-8 border-r-8 border-bento-navy p-4.5 rounded-[24px] shadow-[4px_4px_0_#1d1b20]">
          <span className="text-[10px] text-stone-500 font-extrabold uppercase block tracking-wider">Horas Extras</span>
          <p className="text-3xl font-display font-black text-bento-red mt-1.5 font-mono">
            {totalOvertimeAll.toFixed(1)}h
          </p>
        </div>

        <div className="bg-white border-2 border-b-8 border-r-8 border-bento-navy p-4.5 rounded-[24px] shadow-[4px_4px_0_#1d1b20]">
          <span className="text-[10px] text-stone-500 font-extrabold uppercase block tracking-wider">Atrasos Turno</span>
          <p className="text-3xl font-display font-black text-bento-blue mt-1.5 font-mono">
            {totalDelaysAll}
          </p>
        </div>

        <div className="bg-white border-2 border-b-8 border-r-8 border-bento-navy p-4.5 rounded-[24px] shadow-[4px_4px_0_#1d1b20]">
          <span className="text-[10px] text-stone-500 font-extrabold uppercase block tracking-wider">Faltas Cozinha</span>
          <p className="text-3xl font-display font-black text-stone-400 mt-1.5 font-mono">
            {totalAbsencesAll}
          </p>
        </div>

      </div>

      {/* Consolidated Data Table of Worked Times */}
      <div className="bg-white border-2 border-b-8 border-r-8 border-bento-navy rounded-[32px] p-6 text-bento-navy overflow-hidden shadow-[4px_4px_0px_#1D1B20]">
        <div className="flex justify-between items-center mb-5 pb-3 border-b-2 border-dashed border-stone-200">
          <div>
            <h3 className="text-sm font-display font-black uppercase tracking-tight">
              Listagem de Apuração de Horas da Cozinha
            </h3>
            <p className="text-xs text-stone-500 font-medium">Dados consolidados de atividade acumulada no São João.</p>
          </div>
          <span className="px-3 py-1 bg-bento-bg border-2 border-bento-navy text-[10px] font-black text-bento-blue rounded-full uppercase tracking-wider">
            Acumulados Atuais
          </span>
        </div>

        {/* Responsive Table UI */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-bento-bg border-2 border-bento-navy text-bento-navy uppercase text-[9px] tracking-wider font-black">
              <tr>
                <th className="py-3.5 px-4 rounded-l-xl">Cozinheiro</th>
                <th className="py-3.5 px-4">Função Cozinha</th>
                <th className="py-3.5 px-4 text-center">Dias Ativos</th>
                <th className="py-3.5 px-4 text-center">Horas Trabalhadas</th>
                <th className="py-3.5 px-4 text-center">Horas Extras (&gt;8h)</th>
                <th className="py-3.5 px-4 text-center">Atrasos</th>
                <th className="py-3.5 px-4">Dias e Atrasos Detalhados</th>
                <th className="py-3.5 px-4 text-center rounded-r-xl">Faltas</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-dashed divide-stone-200 font-bold text-stone-705">
              {summaries.map((sum) => (
                <React.Fragment key={sum.employee.id}>
                  <tr 
                    onClick={() => setExpandedEmployeeId(expandedEmployeeId === sum.employee.id ? null : sum.employee.id)}
                    className="hover:bg-bento-bg/40 transition-colors cursor-pointer select-none"
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-2">
                        <ChevronDown className={`w-4 h-4 text-stone-400 transition-transform flex-shrink-0 ${
                          expandedEmployeeId === sum.employee.id ? 'rotate-180 text-bento-red font-black' : ''
                        }`} />
                        <div>
                          <span className="text-sm font-black text-bento-navy block">{sum.employee.fullName}</span>
                          <span className="text-[10px] text-stone-550 mt-0.5 block">{sum.employee.phone}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 font-black">
                      <span className="px-2.5 py-1 bg-white border-2 border-bento-navy text-bento-navy rounded-lg uppercase text-[10px]">
                        {sum.employee.role}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center font-mono font-bold text-bento-navy">
                      {sum.presentDaysCount} dia(s)
                    </td>
                    <td className="py-4 px-4 text-center font-mono text-bento-blue text-sm font-black">
                      {sum.hoursWorkedDecimal}h
                    </td>
                    <td className="py-4 px-4 text-center font-mono">
                      <span className={`px-2 py-1 rounded text-xs ${
                        sum.overtimeHoursDecimal > 0 ? 'bg-bento-red/10 text-bento-red font-black border border-bento-red/35' : 'text-stone-500'
                      }`}>
                        {sum.overtimeHoursDecimal}h
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center font-mono">
                      <span className={`px-2 py-1 rounded text-xs ${
                        sum.delayCount > 0 ? 'bg-bento-yellow/20 text-bento-navy font-black border border-bento-yellow/50' : 'text-stone-500'
                      }`}>
                        {sum.delayCount}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      {sum.delays.length > 0 ? (
                        <div className="flex flex-col gap-1 max-w-[240px]">
                          {sum.delays.map((del, id) => (
                            <span key={id} className="inline-flex flex-wrap items-center gap-1 text-[10px] bg-bento-red/5 text-bento-red border border-bento-red/20 px-1.5 py-0.5 rounded font-mono font-medium leading-none">
                              <strong>{del.date.split('-').reverse().slice(0, 2).join('/')}</strong>: 
                              <span className="font-extrabold">{del.delayMinutes} min</span>
                              <span className="text-[9px] text-stone-500 font-sans">(Escala: {del.scheduledTime})</span>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[11px] text-stone-400 font-medium italic">Sem atrasos</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-center font-mono">
                      <span className={`px-2 py-1 rounded text-xs ${
                        sum.absenceCount > 0 ? 'bg-bento-bg border border-stone-200 text-stone-400 font-bold' : 'text-stone-500'
                      }`}>
                        {sum.absenceCount}
                      </span>
                    </td>
                  </tr>

                  {expandedEmployeeId === sum.employee.id && (
                    <tr className="bg-stone-50/55">
                      <td colSpan={8} className="p-4 border-l-4 border-bento-red">
                        <div className="space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b-2 border-dashed border-stone-200 pb-2 mb-2">
                            <span className="text-xs font-black uppercase text-bento-navy tracking-wider flex items-center gap-1.5">
                              <Clock className="w-4 h-4 text-bento-red animate-pulse" />
                              <span>Detalhamento Diário das Horas e Espelho de Ponto</span>
                            </span>
                            <span className="text-[9px] text-stone-500 font-extrabold font-mono uppercase">
                              Clique no cabeçalho ou nome do profissional para recolher
                            </span>
                          </div>
                          
                          {/* Individual Cumulative Summary Badges */}
                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 bg-[#FEF9EC] p-3 rounded-2xl border-2 border-bento-navy">
                            <div className="bg-white p-2.5 rounded-xl border border-bento-navy text-center shadow-[1.5px_1.5px_0_#1d1b20]">
                              <span className="text-[8.5px] text-stone-500 font-extrabold uppercase block leading-none mb-1">Horas Trabalhadas</span>
                              <span className="text-[13px] font-mono font-black text-bento-blue">{sum.hoursWorkedDecimal.toFixed(1)}h</span>
                            </div>
                            <div className="bg-white p-2.5 rounded-xl border border-bento-navy text-center shadow-[1.5px_1.5px_0_#1d1b20]">
                              <span className="text-[8.5px] text-stone-500 font-extrabold uppercase block leading-none mb-1">Horas Extras</span>
                              <span className="text-[13px] font-mono font-black text-bento-red">{sum.overtimeHoursDecimal.toFixed(1)}h</span>
                            </div>
                            <div className="bg-white p-2.5 rounded-xl border border-bento-navy text-center shadow-[1.5px_1.5px_0_#1d1b20]">
                              <span className="text-[8.5px] text-stone-500 font-extrabold uppercase block leading-none mb-1">Atrasos de Turno</span>
                              <span className="text-[13px] font-mono font-black text-bento-navy">{sum.delayCount}</span>
                            </div>
                            <div className="bg-white p-2.5 rounded-xl border border-bento-navy text-center shadow-[1.5px_1.5px_0_#1d1b20]">
                              <span className="text-[8.5px] text-stone-500 font-extrabold uppercase block leading-none mb-1">Faltas Registradas</span>
                              <span className="text-[13px] font-mono font-black text-stone-400">{sum.absenceCount}</span>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-1">
                            {sum.dailyLogs.map((log) => {
                              const dateFormatted = log.date.split('-').reverse().join('/');
                              const hasWorked = log.hoursWorked > 0;
                              return (
                                <div key={log.date} className="bg-white border-2 border-bento-navy p-3.5 rounded-2xl flex flex-col justify-between shadow-[2px_2px_0px_rgba(29,27,32,1)] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_rgba(29,27,32,1)] transition-all">
                                  <div className="flex justify-between items-center pb-2 border-b border-dashed border-stone-100 mb-2">
                                    <span className="text-xs font-black text-bento-navy">{dateFormatted}</span>
                                    <span className="text-[9px] px-2 py-0.5 bg-bento-bg text-stone-700 rounded-md font-extrabold max-w-[150px] truncate border border-stone-200">
                                      Escala: {log.scheduledTime}
                                    </span>
                                  </div>
                                  
                                  <div className="grid grid-cols-4 gap-1.5 text-center my-1.5">
                                    <div className="p-1 bg-sky-50/50 rounded-lg border border-sky-100/80">
                                      <span className="text-[7.5px] text-stone-400 font-extrabold uppercase block leading-none mb-1">Entrada</span>
                                      <span className="text-[10.5px] font-mono font-black text-sky-700 leading-none">{log.entrada}</span>
                                    </div>
                                    <div className="p-1 bg-amber-50/50 rounded-lg border border-amber-100/85">
                                      <span className="text-[7.5px] text-stone-400 font-extrabold uppercase block leading-none mb-1">S. Int.</span>
                                      <span className="text-[10.5px] font-mono font-black text-amber-700 leading-none">{log.saidaIntervalo}</span>
                                    </div>
                                    <div className="p-1 bg-amber-50/50 rounded-lg border border-amber-100/85">
                                      <span className="text-[7.5px] text-stone-400 font-extrabold uppercase block leading-none mb-1">R. Int.</span>
                                      <span className="text-[10.5px] font-mono font-black text-amber-700 leading-none">{log.retornoIntervalo}</span>
                                    </div>
                                    <div className="p-1 bg-sky-50/50 rounded-lg border border-sky-100/80">
                                      <span className="text-[7.5px] text-stone-400 font-extrabold uppercase block leading-none mb-1">Saída</span>
                                      <span className="text-[10.5px] font-mono font-black text-sky-700 leading-none">{log.saida}</span>
                                    </div>
                                  </div>

                                  <div className="mt-2.5 pt-2 border-t border-stone-100 flex justify-between items-center text-[10px]">
                                    <span className="text-stone-450 font-black uppercase tracking-wider text-[8px]">Horas Trabalhadas:</span>
                                    <span className={`font-mono font-black text-xs ${hasWorked ? 'text-bento-blue' : 'text-stone-400'}`}>
                                      {hasWorked ? `${log.hoursWorked.toFixed(1)}h` : 'Folga/Ausente'}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}

              {summaries.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-stone-400 font-black uppercase">
                    🍉 Nenhum profissional atende aos filtros definidos.
                  </td>
                </tr>
              )}
            </tbody>
            {summaries.length > 0 && (
              <tfoot className="border-t-4 border-double border-bento-navy bg-[#FEF9EC] text-bento-navy font-black">
                <tr>
                  <td className="py-3.5 px-4 font-black text-xs uppercase">Total Geral</td>
                  <td className="py-3.5 px-4"></td>
                  <td className="py-3.5 px-4 text-center font-mono text-xs">
                    {summaries.reduce((acc, curr) => acc + curr.presentDaysCount, 0)} dia(s)
                  </td>
                  <td className="py-3.5 px-4 text-center font-mono text-bento-blue text-sm font-black">
                    {totalHoursWorkedAll.toFixed(1)}h
                  </td>
                  <td className="py-3.5 px-4 text-center font-mono text-bento-red text-xs font-black">
                    {totalOvertimeAll.toFixed(1)}h
                  </td>
                  <td className="py-3.5 px-4 text-center font-mono text-xs text-bento-navy">
                    {totalDelaysAll}
                  </td>
                  <td className="py-3.5 px-4 text-[10px] text-stone-500 font-bold uppercase">
                    Soma Consolidada da Equipe
                  </td>
                  <td className="py-3.5 px-4 text-center font-mono text-xs font-black">
                    {totalAbsencesAll}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Printing guidelines for physical/pdf storage */}
      <div className="bg-bento-bg p-4.5 rounded-2xl border-2 border-bento-navy flex items-start space-x-3.5 text-xs text-stone-600 shadow-[1.5px_1.5px_0_#1d1b20]">
        <ShieldAlert className="w-5 h-5 text-bento-red flex-shrink-0 mt-0.5 animate-pulse" />
        <div className="space-y-1">
          <strong className="text-bento-navy font-black uppercase tracking-wider text-[11px]">Diretrizes e Convenções do Festival:</strong>
          <p className="leading-relaxed font-bold">
            As horas de repouso correspondentes aos intervalos de almoço são descontadas. Adicionais de feriados e banco de compensações de horas extras calculados conforme regência estadual aplicável ao trabalho temporário em eventos.
          </p>
        </div>
      </div>

    </div>

      {/* Print Report Preview Modal - Fully hidden during print-to-PDF */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bento-navy/70 backdrop-blur-md overflow-y-auto print:hidden">
          <div className="w-full max-w-4xl bg-white border-2 border-b-8 border-r-8 border-bento-navy rounded-[40px] p-6 sm:p-8 shadow-[8px_8px_0_#1d1b20] relative text-bento-navy animate-fade-in my-8 max-h-[90vh] overflow-y-auto">
            
            {/* Close button - hidden under printing view */}
            <button
              onClick={() => setIsPrintModalOpen(false)}
              className="absolute top-5 right-5 p-1.5 bg-bento-bg border-2 border-bento-navy text-bento-navy hover:text-bento-red rounded-full cursor-pointer hover:scale-105 transition-transform"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Modal Header */}
            <div className="border-b-4 border-bento-navy pb-5 mb-6">
              <h3 className="text-xl font-display font-black text-bento-navy uppercase tracking-wide flex items-center space-x-2">
                <Printer className="w-6 h-6 text-bento-blue" />
                <span>Visualização de Impressão de Relatório Consolidado</span>
              </h3>
              <p className="text-xs text-stone-500 font-bold mt-1 leading-normal">
                Verifique o relatório de ponto formatado abaixo. Esta visualização garante o perfeito alinhamento de colunas e dados para salvar em PDF ou imprimir.
              </p>
            </div>

            {/* Help Alert regarding Iframe Printing constraints */}
            <div className="mb-6 p-4 bg-amber-50 border-2 border-amber-200 rounded-2xl text-xs text-amber-800 space-y-1">
              <p className="font-extrabold uppercase">💡 NOTA DE SUPORTE - GERAÇÃO DO PDF:</p>
              <p className="font-medium leading-relaxed">
                Devido às regras de segurança de iframe do navegador nesta visualização de desenvolvimento, a ação de imprimir pode ser restrita. Para baixar/imprimir o seu <strong>PDF oficial perfeito com um clique</strong>, basta clicar no botão <strong>"Open in new tab"</strong> (ícone de link externo azul no cabeçalho superior da plataforma) e abrir este utilitário em aba independente.
              </p>
            </div>

            {/* Modal Live Preview Table Container */}
            <div className="bg-[#FEF9EC] border-2 border-bento-navy rounded-[24px] p-6 text-bento-navy space-y-6">
              
              <div className="border-b-2 border-dashed border-stone-300 pb-4">
                <h4 className="text-md font-display font-black uppercase text-bento-navy">Arraiá Fibra Forte - Relatório de Ponto</h4>
                <p className="text-[10px] text-stone-500 font-bold uppercase tracking-wider mt-0.5">Operação de Cozinha • Apuração Consolidada de Horários e Atrasos</p>
              </div>

              {/* Roster aggregation metrics inside printable area */}
              <div className="grid grid-cols-4 gap-4 pb-2">
                <div className="bg-white border border-bento-navy p-3 rounded-xl text-center">
                  <span className="text-[9px] text-stone-500 font-extrabold uppercase">Total Horas</span>
                  <p className="text-lg font-black text-bento-navy font-mono">{totalHoursWorkedAll.toFixed(1)}h</p>
                </div>
                <div className="bg-white border border-bento-navy p-3 rounded-xl text-center">
                  <span className="text-[9px] text-stone-500 font-extrabold uppercase">Horas Extras</span>
                  <p className="text-lg font-black text-bento-red font-mono">{totalOvertimeAll.toFixed(1)}h</p>
                </div>
                <div className="bg-white border border-bento-navy p-3 rounded-xl text-center">
                  <span className="text-[9px] text-stone-500 font-extrabold uppercase">Atrasos</span>
                  <p className="text-lg font-black text-bento-blue font-mono">{totalDelaysAll}</p>
                </div>
                <div className="bg-white border border-bento-navy p-3 rounded-xl text-center">
                  <span className="text-[9px] text-stone-500 font-extrabold uppercase">Faltas</span>
                  <p className="text-lg font-black text-stone-400 font-mono">{totalAbsencesAll}</p>
                </div>
              </div>

              {/* Printable Table */}
              <div className="overflow-x-auto bg-white border border-bento-navy rounded-xl p-3">
                <table className="w-full text-[11px] text-left border-collapse table-fixed">
                  <thead>
                    <tr className="border-b-2 border-bento-navy text-bento-navy uppercase text-[9px] tracking-wider font-extrabold">
                      <th className="py-2 pr-2 w-[22%]">Profissional</th>
                      <th className="py-2 pr-2 w-[15%]">Função</th>
                      <th className="py-2 pr-2 text-center w-[10%]">Dias</th>
                      <th className="py-2 pr-2 text-center w-[12%]">Horas Trab.</th>
                      <th className="py-2 pr-2 text-center w-[12%]">Extras</th>
                      <th className="py-2 pr-2 text-center w-[8%]">Atrasos</th>
                      <th className="py-2 pr-2 w-[21%]">Dias/Atrasos Detalhados</th>
                      <th className="py-2 text-center w-[10%]">Faltas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200">
                    {summaries.map((sum) => (
                      <tr key={sum.employee.id}>
                        <td className="py-2.5 pr-2 truncate">
                          <strong className="text-bento-navy block text-xs truncate">{sum.employee.fullName}</strong>
                          <span className="text-[9px] text-stone-500 block">{sum.employee.phone}</span>
                        </td>
                        <td className="py-2.5 pr-2 font-bold text-xs truncate">{sum.employee.role}</td>
                        <td className="py-2.5 pr-2 text-center font-mono font-bold text-xs">{sum.presentDaysCount}</td>
                        <td className="py-2.5 pr-2 text-center font-mono font-black text-bento-blue text-xs">{sum.hoursWorkedDecimal}h</td>
                        <td className="py-2.5 pr-2 text-center font-mono text-xs">{sum.overtimeHoursDecimal}h</td>
                        <td className="py-2.5 pr-2 text-center font-mono font-black text-bento-red text-xs">{sum.delayCount}</td>
                        <td className="py-2.5 pr-2">
                          {sum.delays.length > 0 ? (
                            <div className="flex flex-col gap-0.5">
                              {sum.delays.map((del, id) => (
                                <span key={id} className="block text-[9px] text-bento-red font-mono font-medium leading-none">
                                  <strong>• {del.date.split('-').reverse().slice(0, 2).join('/')}</strong>: {del.delayMinutes}m
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[9px] text-stone-400 italic">Nenhum</span>
                          )}
                        </td>
                        <td className="py-2.5 text-center font-mono text-xs">{sum.absenceCount}</td>
                      </tr>
                    ))}
                  </tbody>
                  {summaries.length > 0 && (
                    <tfoot className="border-t-2 border-bento-navy bg-[#FEF9EC] font-black">
                      <tr className="font-extrabold text-[#1d1b20]">
                        <td className="py-2.5 pr-2 font-black text-xs uppercase truncate">TOTAL GERAL</td>
                        <td className="py-2.5 pr-2"></td>
                        <td className="py-2.5 pr-2 text-center font-mono font-bold text-xs">{summaries.reduce((acc, curr) => acc + curr.presentDaysCount, 0)}</td>
                        <td className="py-2.5 pr-2 text-center font-mono font-black text-bento-blue text-xs">{totalHoursWorkedAll.toFixed(1)}h</td>
                        <td className="py-2.5 pr-2 text-center font-mono text-xs">{totalOvertimeAll.toFixed(1)}h</td>
                        <td className="py-2.5 pr-2 text-center font-mono text-xs text-bento-red">{totalDelaysAll}</td>
                        <td className="py-2.5 pr-2 text-[9px] text-stone-500 font-bold uppercase truncate">Soma consolidada</td>
                        <td className="py-2.5 text-center font-mono text-xs">{totalAbsencesAll}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>

              {/* Subtitles and signatures */}
              <div className="pt-4 border-t border-dashed border-stone-300 mt-2 grid grid-cols-2 gap-6">
                <div>
                  <h4 className="text-[9px] font-black uppercase text-bento-navy tracking-wider mb-1">Observações Gerais</h4>
                  <p className="text-[9px] text-stone-600 leading-relaxed font-bold">
                    Este documento representa a consolidação eletrônica oficial de registros de ponto dos profissionais contratados do evento Arraiá Fibra Forte.
                  </p>
                </div>
                <div className="flex flex-col justify-end items-center">
                  <div className="w-36 border-b border-bento-navy mb-1" />
                  <span className="text-[8px] font-black text-stone-500 uppercase tracking-widest">Assinatura do Responsável</span>
                </div>
              </div>

            </div>

            {/* Action buttons footer */}
            <div className="mt-8 pt-5 border-t border-stone-200 flex flex-col sm:flex-row gap-3 justify-end">
              <button
                onClick={() => setIsPrintModalOpen(false)}
                className="px-5 py-2.5 bg-bento-bg border-2 border-bento-navy text-bento-navy hover:bg-stone-100 font-black rounded-xl text-xs cursor-pointer uppercase tracking-wider"
              >
                Voltar
              </button>
              <button
                onClick={() => window.print()}
                className="px-5 py-2.5 bg-white border-2 border-bento-navy text-bento-navy hover:bg-stone-100 font-black rounded-xl text-xs cursor-pointer uppercase tracking-wider"
              >
                Imprimir no Navegador
              </button>
              <button
                onClick={handleExportPDF}
                className="px-6 py-2.5 bg-bento-red hover:bg-rose-600 text-white font-black rounded-xl text-xs cursor-pointer uppercase tracking-wider border-b-4 border-r-4 border-bento-navy shadow-md transition-all hover:translate-y-[-1px] active:translate-y-[1px]"
              >
                Baixar PDF Oficial (jsPDF)
              </button>
            </div>

          </div>
        </div>
      )}

      {/* --- PRISTINE DOCUMENT FOR PRINT AND PDF EXCLUSIVELY --- 
          This is hidden on screen and gets automatically displayed during window.print() (or print preview).
          It has standard margin metrics, uses pure table layouts and proportional percentages for perfect PDF columns. */}
      <div className="hidden print:block w-full max-w-full text-stone-900 bg-white p-2 font-sans space-y-6">
        
        {/* Document Header */}
        <div className="border-b-4 border-double border-stone-800 pb-3 flex justify-between items-end">
          <div>
            <h1 className="text-xl font-black uppercase tracking-tight text-stone-900">
              Arraiá Fibra Forte - Relatório de Ponto Consolidado
            </h1>
            <p className="text-[10px] text-stone-700 font-black uppercase tracking-wider mt-1">
              Operação de Cozinha • Apuração de Presenças, Extras e Atrasos Individuais
            </p>
          </div>
          <div className="text-right text-[10px] font-mono">
            <strong>Gerado em:</strong> {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>

        {/* Global Statistics Scoreblock */}
        <div className="grid grid-cols-4 gap-4 py-2 border-b border-stone-300">
          <div className="border border-stone-400 p-2 text-center rounded bg-stone-50">
            <span className="text-[8px] text-stone-500 font-bold uppercase block">Total Horas</span>
            <p className="text-sm font-black font-mono text-stone-900">{totalHoursWorkedAll.toFixed(1)}h</p>
          </div>
          <div className="border border-stone-400 p-2 text-center rounded bg-stone-50">
            <span className="text-[8px] text-stone-500 font-bold uppercase block">Horas Extras</span>
            <p className="text-sm font-black font-mono text-stone-900">{totalOvertimeAll.toFixed(1)}h</p>
          </div>
          <div className="border border-stone-400 p-2 text-center rounded bg-stone-50">
            <span className="text-[8px] text-stone-500 font-bold uppercase block">Atrasos de Turno</span>
            <p className="text-sm font-black font-mono text-stone-900">{totalDelaysAll}</p>
          </div>
          <div className="border border-stone-400 p-2 text-center rounded bg-stone-50">
            <span className="text-[8px] text-stone-500 font-bold uppercase block">Faltas Registradas</span>
            <p className="text-sm font-black font-mono text-stone-900">{totalAbsencesAll}</p>
          </div>
        </div>

        {/* The Exact Aligned Print Table */}
        <table className="w-full text-[10px] text-left border-collapse table-fixed">
          <thead>
            <tr className="border-b-2 border-stone-800 text-stone-900 uppercase text-[8px] tracking-wider font-extrabold bg-stone-100">
              <th className="py-2 px-1.5 text-left w-[22%] border border-stone-300">Profissional</th>
              <th className="py-2 px-1.5 text-left w-[15%] border border-stone-300">Função</th>
              <th className="py-2 px-1.5 text-center w-[10%] border border-stone-300">Dias Ativ.</th>
              <th className="py-2 px-1.5 text-center w-[12%] border border-stone-300">Horas Trab.</th>
              <th className="py-2 px-1.5 text-center w-[12%] border border-stone-300">H. Extras</th>
              <th className="py-2 px-1.5 text-center w-[8%] border border-stone-300">Atrasos</th>
              <th className="py-2 px-1.5 text-left w-[21%] border border-stone-300">Detalhamento dos Atrasos</th>
              <th className="py-2 px-1.5 text-center w-[10%] border border-stone-300">Faltas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-300">
            {summaries.map((sum) => (
              <tr key={sum.employee.id} className="align-middle">
                <td className="py-2.5 px-1.5 border border-stone-300">
                  <div className="font-extrabold text-stone-950 text-xs">{sum.employee.fullName}</div>
                  <div className="text-[8px] text-stone-600">{sum.employee.phone}</div>
                </td>
                <td className="py-2.5 px-1.5 border border-stone-300 font-bold text-[10px]">{sum.employee.role}</td>
                <td className="py-2.5 px-1.5 border border-stone-300 text-center font-mono font-bold text-[10px]">{sum.presentDaysCount}</td>
                <td className="py-2.5 px-1.5 border border-stone-300 text-center font-mono font-extrabold text-[10px]">{sum.hoursWorkedDecimal}h</td>
                <td className="py-2.5 px-1.5 border border-stone-300 text-center font-mono text-[10px]">{sum.overtimeHoursDecimal}h</td>
                <td className="py-2.5 px-1.5 border border-stone-300 text-center font-mono font-extrabold text-[10px]">{sum.delayCount}</td>
                <td className="py-2.5 px-1.5 border border-stone-300">
                  {sum.delays.length > 0 ? (
                    <div className="space-y-0.5">
                      {sum.delays.map((del, id) => (
                        <div key={id} className="text-[9px] font-mono leading-none tracking-normal">
                          <span className="font-bold">• {del.date.split('-').reverse().slice(0, 2).join('/')}</span>: {del.delayMinutes} min <span className="text-[8px] text-stone-500">(Escala {del.scheduledTime})</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-stone-400 italic text-[9px]">Sem atrasos</span>
                  )}
                </td>
                <td className="py-2.5 px-1.5 border border-stone-300 text-center font-mono text-[10px]">{sum.absenceCount}</td>
              </tr>
            ))}
          </tbody>
          {summaries.length > 0 && (
            <tfoot className="border-t-2 border-stone-800 bg-stone-100 font-black">
              <tr className="font-extrabold text-stone-900">
                <td className="py-2.5 px-1.5 border border-stone-300 font-extrabold text-[10px] uppercase">TOTAL GERAL</td>
                <td className="py-2.5 px-1.5 border border-stone-300"></td>
                <td className="py-2.5 px-1.5 border border-stone-300 text-center font-mono font-bold text-[10px]">
                  {summaries.reduce((acc, curr) => acc + curr.presentDaysCount, 0)}
                </td>
                <td className="py-2.5 px-1.5 border border-stone-300 text-center font-mono font-extrabold text-[10px]">
                  {totalHoursWorkedAll.toFixed(1)}h
                </td>
                <td className="py-2.5 px-1.5 border border-stone-300 text-center font-mono text-[10px]">
                  {totalOvertimeAll.toFixed(1)}h
                </td>
                <td className="py-2.5 px-1.5 border border-stone-300 text-center font-mono font-bold text-[10px]">
                  {totalDelaysAll}
                </td>
                <td className="py-2.5 px-1.5 border border-stone-300 text-[8px] text-stone-500 font-bold uppercase truncate">Soma consolidada</td>
                <td className="py-2.5 px-1.5 border border-stone-300 text-center font-mono text-[10px]">{totalAbsencesAll}</td>
              </tr>
            </tfoot>
          )}
        </table>

        {/* General notes & Signatures */}
        <div className="pt-10 grid grid-cols-2 gap-12 text-[9px]">
          <div>
            <h4 className="font-extrabold uppercase mb-1">Notas Administrativas</h4>
            <p className="text-stone-600 leading-relaxed">
              Consolidado fiscal oficial gerido de acordo com a escala programada de cozinha para o festival Arraiá Fibra Forte - Junho 2026. Todos os dados coletados respeitam as tolerâncias de acordos sindicais locais aplicáveis.
            </p>
          </div>
          <div className="flex flex-col justify-end items-center">
            <div className="w-48 border-b-2 border-stone-800 mb-1" />
            <span className="font-extrabold text-stone-500 uppercase tracking-widest text-[8px]">Assinatura Coordenador de Ponto</span>
          </div>
        </div>

      </div>
    </>
  );
}
