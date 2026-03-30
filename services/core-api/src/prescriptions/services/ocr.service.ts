import { Injectable } from '@nestjs/common';
import { createWorker } from 'tesseract.js';

export type ParsedPrescriptionItem = {
  medName: string;
  dosage?: string;
  timesPerDay?: number;
  durationDays?: number;
  notes?: string;
  schedule?: {
    morning?: number;
    noon?: number;
    afternoon?: number;
    evening?: number;
  };
};

export type ParsedPrescription = {
  diseaseName?: string;
  items: ParsedPrescriptionItem[];
  followUpDate?: string;
};

export type OcrResult = {
  ocrText: string;
  language?: 'vi' | 'en';
  parsed: ParsedPrescription;
};

@Injectable()
export class OcrService {
  async process(fileBuffer: Buffer): Promise<OcrResult> {
    const mode = process.env.OCR_MODE ?? 'tesseract';

    let ocrText = '';
    if (mode === 'mock') {
      ocrText = `Chẩn đoán: Viêm họng cấp\n1. Amoxicillin 500mg\nSáng 1 viên, Chiều 1 viên. Uống sau ăn.\n7 ngày.\n2. Paracetamol 500mg\nSáng 1 viên, Trưa 1 viên, Chiều 1 viên, Tối 1 viên.\n3 ngày.\nTái khám ngày: 2026-04-05`;
    } else {
      const worker = await createWorker('vie+eng');
      const {
        data: { text },
      } = await worker.recognize(fileBuffer);
      ocrText = text;
      await worker.terminate();
    }

    const parsed = this.parseVietnamesePrescription(ocrText);

    return {
      ocrText,
      language: 'vi',
      parsed,
    };
  }

  parseVietnamesePrescription(text: string): ParsedPrescription {
    // Normalize common OCR misreads
    const normalizedText = text
      .replace(/\|/g, '1') // OCR often reads 1 as |
      .replace(/Vién/g, 'Viên')
      .replace(/Uông/g, 'Uống');

    const lines = normalizedText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    const result: ParsedPrescription = {
      items: [],
    };

    let currentItem: Partial<ParsedPrescriptionItem> | null = null;
    let capturingDiagnosis = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lowerLine = line.toLowerCase();

      // Extract Diagnosis (can be multi-line)
      if (
        lowerLine.includes('chan đoán:') ||
        lowerLine.includes('chan doan:') ||
        lowerLine.includes('chẩn đoán:')
      ) {
        result.diseaseName = line.split(':').pop()?.trim();
        capturingDiagnosis = true;
        continue;
      }

      if (capturingDiagnosis) {
        if (
          line.match(/^(\d+|%)\./) ||
          lowerLine.includes('tái khám') ||
          lowerLine.includes('lời dặn')
        ) {
          capturingDiagnosis = false;
        } else {
          result.diseaseName =
            (result.diseaseName ? result.diseaseName + ' ' : '') + line;
          continue;
        }
      }

      // Extract Follow-up Date
      if (
        lowerLine.includes('tái khám ngày:') ||
        lowerLine.includes('tai kham ngay:')
      ) {
        const dateMatch = line.match(
          /(\d{2}[\/\-]\d{2}[\/\-]\d{4})|(\d{4}[\/\-]\d{2}[\/\-]\d{2})/,
        );
        if (dateMatch) {
          result.followUpDate = dateMatch[0];
        }
        continue;
      }

      // Extract Items (Fuzzy matching for 1., 2., 3. or misreads like %., 1/.)
      const itemMatch = line.match(/^(\d+|%|&|\*)\.?\s+(.+)/);
      if (itemMatch) {
        if (currentItem && currentItem.medName) {
          result.items.push(currentItem as ParsedPrescriptionItem);
        }

        // Clean med name: remove trailing "XX Viên" or "XX v"
        let medName = itemMatch[2].trim();
        medName = medName.replace(/\d+\s*(Viên|Vien|v|V)$/i, '').trim();
        medName = medName.replace(/[\-\s]+\d+mg$/i, '').trim(); // Remove trailing mg if duplicated

        currentItem = {
          medName,
          schedule: {},
        };
        continue;
      }

      if (currentItem) {
        // Look for schedule (Sáng, Trưa, Chiều, Tối)
        const hasSchedule = lowerLine.match(
          /(sáng|sang|trưa|trua|chiều|chieu|tối|toi)/i,
        );

        if (hasSchedule) {
          const morningMatch = lowerLine.match(/(sáng|sang)\s*(\d+)/i);
          const noonMatch = lowerLine.match(/(trưa|trua)\s*(\d+)/i);
          const afternoonMatch = lowerLine.match(/(chiều|chieu)\s*(\d+)/i);
          const eveningMatch = lowerLine.match(/(tối|toi)\s*(\d+)/i);

          if (morningMatch)
            currentItem.schedule!.morning = parseInt(morningMatch[2]);
          if (noonMatch) currentItem.schedule!.noon = parseInt(noonMatch[2]);
          if (afternoonMatch)
            currentItem.schedule!.afternoon = parseInt(afternoonMatch[2]);
          if (eveningMatch)
            currentItem.schedule!.evening = parseInt(eveningMatch[2]);
        }

        // Duration days
        const durationMatch = lowerLine.match(/(\d+)\s*(ngày|ngay)/i);
        if (durationMatch) {
          currentItem.durationDays = parseInt(durationMatch[1]);
        }

        // Times per day (if not already calculated from schedule)
        if (
          currentItem.schedule &&
          Object.keys(currentItem.schedule).length > 0
        ) {
          currentItem.timesPerDay = Object.values(currentItem.schedule).filter(
            (v) => v > 0,
          ).length;
        }

        // Notes (if it contains "uống", "ăn", "nhai", etc.)
        if (
          lowerLine.includes('uống') ||
          lowerLine.includes('uong') ||
          lowerLine.includes('ăn') ||
          lowerLine.includes('an') ||
          lowerLine.includes('nhai')
        ) {
          currentItem.notes =
            (currentItem.notes ? currentItem.notes + ' ' : '') + line;
        }
      }
    }

    if (currentItem && currentItem.medName) {
      result.items.push(currentItem as ParsedPrescriptionItem);
    }

    return result;
  }
}
