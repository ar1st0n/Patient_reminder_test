import { OcrService } from './ocr.service';

describe('Vietnamese Prescription Parser', () => {
  let ocrService: OcrService;

  beforeEach(() => {
    ocrService = new OcrService();
  });

  it('should parse a standard Vietnamese prescription', () => {
    const text = `
Chẩn đoán: Viêm họng cấp
1. Amoxicillin 500mg
Sáng 1 viên, Chiều 1 viên. Uống sau ăn.
7 ngày.
2. Paracetamol 500mg
Sáng 1 viên, Trưa 1 viên, Chiều 1 viên, Tối 1 viên.
3 ngày.
Tái khám ngày: 2026-04-05
    `;

    const result = ocrService.parseVietnamesePrescription(text);

    expect(result.diseaseName).toBe('Viêm họng cấp');
    expect(result.followUpDate).toBe('2026-04-05');
    expect(result.items).toHaveLength(2);

    expect(result.items[0].medName).toBe('Amoxicillin 500mg');
    expect(result.items[0].schedule?.morning).toBe(1);
    expect(result.items[0].schedule?.afternoon).toBe(1);
    expect(result.items[0].durationDays).toBe(7);
    expect(result.items[0].notes).toContain('Uống sau ăn');

    expect(result.items[1].medName).toBe('Paracetamol 500mg');
    expect(result.items[1].schedule?.morning).toBe(1);
    expect(result.items[1].schedule?.noon).toBe(1);
    expect(result.items[1].schedule?.afternoon).toBe(1);
    expect(result.items[1].schedule?.evening).toBe(1);
    expect(result.items[1].durationDays).toBe(3);
  });

  it('should handle variations in formatting', () => {
    const text = `
Chan doan: Viem phoi
1. Augmentin 1g
Sang 1v, Toi 1v
10 ngay
Tai kham ngay: 15/12/2025
    `;

    const result = ocrService.parseVietnamesePrescription(text);

    expect(result.diseaseName).toBe('Viem phoi');
    expect(result.followUpDate).toBe('15/12/2025');
    expect(result.items[0].medName).toBe('Augmentin 1g');
    expect(result.items[0].schedule?.morning).toBe(1);
    expect(result.items[0].schedule?.evening).toBe(1);
    expect(result.items[0].durationDays).toBe(10);
  });
});
