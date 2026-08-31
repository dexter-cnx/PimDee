import type { Lang } from './types'

export const RACE_SECONDS = 60

const RACE_TEXT: Record<Lang, string> = {
  TH: 'วันนี้เราเริ่มฝึกพิมพ์ด้วยจังหวะสม่ำเสมอ ความแม่นยำสำคัญกว่าความเร็ว เมื่อพิมพ์ผิดให้รักษาสมาธิแล้วไปต่ออย่างเป็นธรรมชาติ ฝึกมองข้อความแทนการมองแป้น พยายามกลับนิ้วสู่แถวเหย้าทุกครั้ง งานที่ดีเกิดจากการฝึกซ้ำอย่างมีคุณภาพ พิมพ์ข้อความสั้นยาวสลับกัน ใช้ตัวเลข 24 และเวลา 09:30 ให้คล่อง แล้วค่อยเพิ่มความเร็วเมื่อรู้สึกว่ามือเริ่มจำตำแหน่งได้เอง วันนี้เราเริ่มฝึกพิมพ์ด้วยจังหวะสม่ำเสมอ ความแม่นยำสำคัญกว่าความเร็ว เมื่อพิมพ์ผิดให้รักษาสมาธิแล้วไปต่ออย่างเป็นธรรมชาติ',
  EN: 'Build a steady typing rhythm and protect accuracy before chasing speed. Keep your eyes on the text instead of the keyboard and return your fingers to the home row after every reach. Good typing comes from calm repetition, clean movement, and consistent practice. Mix short and long words, type numbers such as 24 and times such as 09:30, then increase speed only when the keys begin to feel automatic. Build a steady typing rhythm and protect accuracy before chasing speed.',
}

export const TONE_MARKS = ['่', '้', '๊', '๋'] as const

export const TONE_PROMPTS = [
  'เก่า ข่าว เก่ง เล่น นั่ง ส่ง ต่อ อ่าน',
  'ข้าว บ้าน ห้อง น้อง ต้อง ใช้ ได้ แล้ว',
  'ก๊อก โต๊ะ จ๊ะ เดี๋ยว เก๋า จ๋า',
  'พี่นั่งกินข้าวที่บ้าน แล้วค่อยไปซื้อโต๊ะใหม่',
  'แม่บอกว่าเดี๋ยวค่อยกลับบ้านหลังเลิกงาน',
  'น้องซื้อข้าวแล้วนั่งอ่านข่าวอยู่ข้างโต๊ะ',
]

export function raceText(language: Lang) {
  return RACE_TEXT[language]
}

export function tonePrompt(round: number) {
  return TONE_PROMPTS[Math.abs(round) % TONE_PROMPTS.length]
}

export function countToneMarks(text: string) {
  return [...text].filter((char) => (TONE_MARKS as readonly string[]).includes(char)).length
}

export function toneAccuracy(mistakes: Record<string, number>, text: string) {
  const total = countToneMarks(text)
  if (!total) return 100
  const wrong = Object.entries(mistakes)
    .filter(([char]) => (TONE_MARKS as readonly string[]).includes(char))
    .reduce((sum, [, count]) => sum + count, 0)
  return Math.max(0, Math.round(((total - wrong) / total) * 100))
}
