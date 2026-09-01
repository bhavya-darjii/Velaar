/* eslint-disable */
// @ts-nocheck
import pptxgen from 'pptxgenjs';

const cleanFileName = (value = 'lecture') =>
  value.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();

const THEMES = [
  {
    id: 'neon-synthwave',
    bg: '09090B',
    accent1: '6366F1',
    accent2: 'EC4899',
    textPrimary: 'F8FAFC',
    textSecondary: 'E4E4E7',
    textMuted: 'A1A1AA',
  },
  {
    id: 'cyberpunk',
    bg: '171717',
    accent1: '10B981',
    accent2: '8B5CF6',
    textPrimary: 'FFFFFF',
    textSecondary: 'D4D4D8',
    textMuted: 'A3A3A3',
  },
  {
    id: 'deep-tech',
    bg: '020617',
    accent1: '3B82F6',
    accent2: '06B6D4',
    textPrimary: 'F1F5F9',
    textSecondary: 'E2E8F0',
    textMuted: '94A3B8',
  },
  {
    id: 'sunset-glow',
    bg: '1C1917',
    accent1: 'F97316',
    accent2: 'E11D48',
    textPrimary: 'FAFAF9',
    textSecondary: 'E7E5E4',
    textMuted: 'A8A29E',
  }
];

export const getRandomThemeId = () => THEMES[Math.floor(Math.random() * THEMES.length)].id;

const addFooter = (slide, index, subjectName, theme) => {
  slide.addText(`${subjectName ? subjectName.toUpperCase() + '  |  ' : 'VELAAR  |  '}${String(index).padStart(2, '0')}`, {
    x: 7.8, y: 7.02, w: 5, h: 0.18,
    fontFace: 'Aptos', fontSize: 8, color: theme.textMuted, margin: 0, align: 'right'
  });
};

export const downloadLecturePresentation = async (presentation, { subjectName, lectureTitle, themeId }) => {
  const pptx = new pptxgen();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = 'Velaar';
  pptx.company = 'Velaar';
  pptx.subject = subjectName || 'Lecture presentation';
  pptx.title = presentation.title || lectureTitle || 'Lecture presentation';
  pptx.lang = 'en-IN';
  pptx.theme = { headFontFace: 'Aptos Display', bodyFontFace: 'Aptos', lang: 'en-IN' };

  const theme = themeId ? THEMES.find(t => t.id === themeId) || THEMES[0] : THEMES[Math.floor(Math.random() * THEMES.length)];

  const processedSlides = [];
  (presentation.slides || []).forEach((content, index) => {
    if (index === 0) {
      processedSlides.push(content);
      return;
    }
    
    const maxBullets = 6; 
    const bullets = content.bullets || [];
    if (bullets.length <= maxBullets) {
      processedSlides.push(content);
    } else {
      for (let i = 0; i < bullets.length; i += maxBullets) {
        processedSlides.push({
          ...content,
          title: i === 0 ? content.title : `${content.title} (Cont.)`,
          bullets: bullets.slice(i, i + maxBullets)
        });
      }
    }
  });

  processedSlides.forEach((content, index) => {
    const slide = pptx.addSlide();
    const isTitle = index === 0;

    // Dark sleek background
    slide.background = { color: theme.bg };

    if (isTitle) {
      // Background abstract decorative shapes (rendered first so they are behind text)
      slide.addShape(pptx.ShapeType.rect, {
        x: 0, y: 0, w: 13.33, h: 0.25,
        fill: { color: theme.accent2 }
      });
      slide.addShape(pptx.ShapeType.ellipse, {
        x: -2, y: -2, w: 6, h: 6,
        fill: { color: theme.accent1 }, transparency: 85
      });
      slide.addShape(pptx.ShapeType.ellipse, {
        x: 9, y: 4, w: 7, h: 7,
        fill: { color: theme.accent2 }, transparency: 85
      });

      slide.addText(content.title || presentation.title || lectureTitle || 'Lecture', {
        x: 0.8, y: 2.2, w: 11.5, h: 1.5,
        fontFace: 'Aptos Display', fontSize: 44, bold: true,
        color: theme.textPrimary, margin: 0,
      });
      
      slide.addShape(pptx.ShapeType.rect, {
        x: 0.8, y: 4.0, w: 1.5, h: 0.05,
        fill: { color: theme.accent1 }
      });

      slide.addText(presentation.subtitle || subjectName || '', {
        x: 0.8, y: 4.3, w: 10, h: 0.5,
        fontFace: 'Aptos', fontSize: 20, color: theme.textMuted, margin: 0,
      });
    } else {
      // Content Slide Design - Background shapes first!
      // Top left vertical accent
      slide.addShape(pptx.ShapeType.rect, {
        x: 0.45, y: 0.45, w: 0.08, h: 0.5,
        fill: { color: theme.accent1 }
      });

      // Subtle background watermark (now rendering behind text)
      slide.addShape(pptx.ShapeType.ellipse, {
        x: 10, y: -2, w: 5, h: 5,
        fill: { color: theme.accent2 }, transparency: 95
      });

      // Slide title
      slide.addText(content.title || `Slide ${index + 1}`, {
        x: 0.7, y: 0.4, w: 11.5, h: 0.6,
        fontFace: 'Aptos Display', fontSize: 26, bold: true,
        color: theme.textPrimary, margin: 0,
      });

      const bullets = (content.bullets || []).map((bullet) => `• ${bullet}`).join('\n');
      slide.addText(bullets || '', {
        x: 0.55, y: 1.3, w: 12.2, h: 5.4,
        fontFace: 'Aptos', fontSize: 18,
        color: theme.textSecondary, margin: 0.1,
        valign: 'top', lineSpacingMultiple: 1.3,
      });

      if (content.speakerNotes) slide.addNotes(content.speakerNotes);
    }

    addFooter(slide, index + 1, subjectName, theme);
  });

  await pptx.writeFile({ fileName: `${cleanFileName(lectureTitle || presentation.title)}-velaar.pptx` });
};

