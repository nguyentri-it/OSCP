import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const lessons = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/lessons' }),
  schema: z.object({
    title: z.string(),
    code: z.string().regex(/^\d\.\d$/),
    level: z.number().int().min(0).max(8),
    summary: z.string(),
    duration: z.string(),
    objectives: z.array(z.string()).min(2),
    status: z.enum(['khung', 'hoan-thien']).default('hoan-thien'),
    // Ngày cập nhật nội dung gần nhất (YYYY-MM-DD). Quan trọng với các bài về mối đe doạ AI vốn đổi nhanh.
    updated: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    // Mã các bài nên học trước (ví dụ ['2.7', '3.1']); hiện ở đầu bài để người học khỏi nhảy cóc.
    prereq: z.array(z.string().regex(/^\d\.\d$/)).optional(),
  }),
});

export const collections = { lessons };
