import { useTranslation } from 'react-i18next'

type Props = { onStart: () => void }

export function Onboarding({ onStart }: Props) {
  const { i18n } = useTranslation()
  const thai = i18n.language.startsWith('th')

  return <main className="onboarding-shell">
    <section className="onboarding-card">
      <div className="onboarding-copy">
        <span className="onboarding-kicker">PimDee · พิมพ์ดี</span>
        <h1>{thai ? 'เริ่มพิมพ์ไทยให้คล่อง แบบค่อยเป็นค่อยไป' : 'Build confident typing, one key at a time'}</h1>
        <p>{thai
          ? 'ไม่ต้องเปลี่ยนภาษาคีย์บอร์ดในเครื่อง เริ่มจากตำแหน่งนิ้ว ฝึกทีละบท และให้พิมพ์ดีช่วยจำจุดที่ยังพลาดให้คุณ'
          : 'No OS keyboard switching required. Learn finger placement lesson by lesson while PimDee remembers the keys that need more practice.'}</p>
        <div className="onboarding-points" aria-label={thai ? 'สิ่งที่จะได้ฝึก' : 'What you will practice'}>
          <span>⌨️ {thai ? 'คีย์บอร์ดเกษมณีจริง' : 'Real Kedmanee mapping'}</span>
          <span>🎯 {thai ? '36 บทแบบไล่ระดับ' : '36 progressive lessons'}</span>
          <span>📈 {thai ? 'วัด WPM และความแม่นยำ' : 'WPM & accuracy tracking'}</span>
        </div>
        <button className="onboarding-start" onClick={onStart}>{thai ? 'เริ่มบทแรก' : 'Start lesson one'} <span aria-hidden="true">→</span></button>
        <small>{thai ? 'หน้านี้จะหายไปหลังจากคุณฝึกและมีผลลัพธ์แรกถูกบันทึก' : 'This welcome screen disappears after your first practice result is saved.'}</small>
      </div>
      <div className="onboarding-visual" aria-hidden="true">
        <div className="visual-orbit orbit-one" />
        <div className="visual-orbit orbit-two" />
        <div className="visual-keyboard">
          <div className="visual-screen"><span>พิมพ์ดี</span><strong>ฟ ห ก ด</strong></div>
          <div className="visual-keys">
            {['ฟ','ห','ก','ด','่','า','ส','ว','Enter'].map((key) => <span key={key} className={key === 'ก' ? 'focus' : ''}>{key}</span>)}
          </div>
        </div>
        <div className="visual-badge badge-speed"><strong>12</strong><span>WPM</span></div>
        <div className="visual-badge badge-accuracy"><strong>98%</strong><span>{thai ? 'แม่นยำ' : 'Accuracy'}</span></div>
      </div>
    </section>
  </main>
}
