// Trang mẫu chỉ ở bản dev (route /dev/ui-kit): xem font, màu và component nền "Lớp học ấm áp" (SPEC mục 4).
// Chữ mẫu viết thẳng ở đây vì đây là công cụ kiểm tra, không phải giao diện người dùng.
import { useState, type ReactNode } from 'react'
import Button from '../../components/Button'
import ButtonLink from '../../components/ButtonLink'
import Card from '../../components/ui/Card'
import FormField from '../../components/ui/FormField'
import PasswordInput from '../../components/ui/PasswordInput'
import SubjectChip from '../../components/ui/SubjectChip'
import { inputClass, textareaClass } from '../../components/ui/formStyles'

const SAMPLE = 'Cô dạy Toán lớp 1 – Đếm số lượng đồ vật'
const MARKS = 'ỡ ữ ặ ậ ẫ ễ ộ ở ợ ừ ự ỷ ỹ Ẩ Ắ Ặ Ế Ộ Ợ Ữ Ỳ đĐ ơƠ ưƯ'
const PANGRAM = 'Vợ chồng Bác Hưởng ăn quýt ngọt, uống trà sữa, hỏi: "Ừ, ổn chứ?"'

const SWATCHES = [
  ['paper', 'bg-paper'],
  ['surface', 'bg-surface'],
  ['line', 'bg-line'],
  ['ink', 'bg-ink'],
  ['ink-soft', 'bg-ink-soft'],
  ['brand', 'bg-brand'],
  ['brand-strong', 'bg-brand-strong'],
  ['brand-base', 'bg-brand-base'],
  ['brand-soft', 'bg-brand-soft'],
  ['sun', 'bg-sun'],
  ['sun-base', 'bg-sun-base'],
  ['sun-ink', 'bg-sun-ink'],
  ['warn-soft', 'bg-warn-soft'],
  ['math-soft', 'bg-math-soft'],
  ['math-mark', 'bg-math-mark'],
  ['viet-soft', 'bg-viet-soft'],
  ['viet-mark', 'bg-viet-mark'],
  ['eng-soft', 'bg-eng-soft'],
  ['eng-mark', 'bg-eng-mark'],
] as const

const VARIANTS = ['primary', 'accent', 'secondary', 'ghost'] as const
const SUBJECTS = ['MATH', 'VIETNAMESE', 'ENGLISH', 'OTHER'] as const

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-display text-3xl font-bold">{title}</h2>
      {children}
    </section>
  )
}

export default function UiKit() {
  const [selected, setSelected] = useState('MATH')
  const [password, setPassword] = useState('')

  return (
      <main className="min-h-screen bg-paper p-8 text-ink">
        <div className="mx-auto flex max-w-4xl flex-col gap-10">
          <Section title="Font">
            {[600, 700, 800].map((weight) => (
              <div key={weight} className="rounded-card bg-surface p-6 shadow-card">
                <p className="text-sm text-ink-soft">Baloo 2 · {weight}</p>
                <h1 className="font-display text-5xl leading-tight" style={{ fontWeight: weight }}>
                  {SAMPLE}
                </h1>
                <p className="font-display text-3xl" style={{ fontWeight: weight }}>
                  {MARKS}
                </p>
              </div>
            ))}
            {[600, 700, 800, 900].map((weight) => (
              <div key={weight} className="rounded-card bg-surface p-6 shadow-card">
                <p className="text-sm text-ink-soft">Nunito · {weight}</p>
                <p className="text-2xl" style={{ fontWeight: weight }}>
                  {PANGRAM}
                </p>
                <p className="text-lg" style={{ fontWeight: weight }}>
                  {MARKS}
                </p>
              </div>
            ))}
          </Section>

          <Section title="Màu">
            <div className="grid grid-cols-4 gap-3 sm:grid-cols-7">
              {SWATCHES.map(([name, className]) => (
                <div key={name} className="text-xs">
                  <div className={`h-12 rounded-xl border border-line ${className}`} />
                  {name}
                </div>
              ))}
            </div>
          </Section>

          <Section title="Nút">
            {(['md', 'lg'] as const).map((size) => (
              <div key={size} className="flex flex-wrap items-center gap-4 pb-2">
                {VARIANTS.map((variant) => (
                  <Button key={variant} variant={variant} size={size}>
                    {variant} {size}
                  </Button>
                ))}
                {VARIANTS.map((variant) => (
                  <Button key={`d-${variant}`} variant={variant} size={size} disabled>
                    {variant} {size} tắt
                  </Button>
                ))}
              </div>
            ))}
            <div>
              <ButtonLink to="/dev/ui-kit" variant="secondary">
                ButtonLink secondary
              </ButtonLink>
            </div>
          </Section>

          <Section title="Thẻ">
            <div className="grid gap-4 sm:grid-cols-3">
              {(['sm', 'md', 'lg'] as const).map((padding) => (
                <Card key={padding} padding={padding}>
                  Thẻ padding {padding}
                </Card>
              ))}
            </div>
            <Card interactive className="flex flex-col items-start gap-3">
              <h3 className="font-display text-2xl font-bold">Đếm số lượng đồ vật</h3>
              <SubjectChip subject="MATH" label="Toán · Lớp 1" />
              <Button variant="accent">Chơi thử</Button>
            </Card>
          </Section>

          <Section title="Chip môn">
            <div className="flex flex-wrap gap-3">
              {SUBJECTS.map((subject) => (
                <SubjectChip key={subject} subject={subject} label={subject === 'OTHER' ? 'Môn khác (mặc định)' : undefined} />
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              {SUBJECTS.map((subject) => (
                <SubjectChip
                  key={subject}
                  subject={subject}
                  label={subject === 'OTHER' ? 'Môn khác (mặc định)' : undefined}
                  selected={selected === subject}
                  onClick={() => setSelected(subject)}
                />
              ))}
            </div>
          </Section>

          <Section title="Ô nhập">
            <Card className="flex flex-col gap-5">
              <FormField id="kit-plain" label="Tên game">
                <input id="kit-plain" className={inputClass()} placeholder="Ví dụ: Đếm số" />
              </FormField>
              <FormField id="kit-hint" label="Chủ đề" hint="Gợi ý: viết ngắn gọn, dễ hiểu.">
                <input id="kit-hint" className={inputClass()} />
              </FormField>
              <FormField id="kit-error" label="Email" error="Email chưa đúng định dạng.">
                <input id="kit-error" className={inputClass(true)} defaultValue="abc" aria-invalid />
              </FormField>
              <FormField id="kit-disabled" label="Đã khóa">
                <input id="kit-disabled" className={inputClass()} disabled defaultValue="Không sửa được" />
              </FormField>
              <FormField id="kit-pass" label="Mật khẩu">
                <PasswordInput
                  id="kit-pass"
                  name="kit-pass"
                  value={password}
                  onChange={setPassword}
                  autoComplete="off"
                />
              </FormField>
              <FormField id="kit-area" label="Mô tả">
                <textarea id="kit-area" className={textareaClass()} />
              </FormField>
            </Card>
          </Section>
        </div>
      </main>
  )
}
