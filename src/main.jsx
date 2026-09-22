import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Bell,
  BookOpen,
  Brain,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Clock3,
  Dumbbell,
  FileText,
  Footprints,
  Gauge,
  Heart,
  HeartPulse,
  LayoutDashboard,
  Leaf,
  MessageCircle,
  Moon,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Target,
  Timer,
  Trash2,
  UserRound,
  Watch,
  Waves,
  Wind,
  X,
  Zap,
} from 'lucide-react';
import './styles.css';

const STORAGE_KEY = 'nova-user-space-v2';
const DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const NAV_ITEMS = [
  { id: 'overview', label: 'Обзор', icon: LayoutDashboard },
  { id: 'knowledge', label: 'Знания', icon: BookOpen },
  { id: 'training', label: 'Тренировки', icon: Dumbbell },
  { id: 'analytics', label: 'Аналитика', icon: BarChart3 },
];
const SYSTEM_ITEMS = [
  { id: 'notes', label: 'Мои заметки', icon: FileText },
  { id: 'profile', label: 'Профиль и данные', icon: UserRound },
];
const INTEREST_SUGGESTIONS = ['Искусственный интеллект', 'Продукты', 'Программирование', 'Психология', 'Финансы', 'Бег', 'Силовые', 'Сон', 'Питание'];
const LEVELS = [
  { value: 'beginner', label: 'Начинаю', text: 'Хочу разобраться с нуля' },
  { value: 'intermediate', label: 'Уверенный уровень', text: 'Знаю основы, хочу глубже' },
  { value: 'advanced', label: 'Продвинутый', text: 'Ищу сложные задачи' },
];
const COACH_STYLES = [
  { value: 'calm', label: 'Спокойно и бережно', icon: '◌' },
  { value: 'balanced', label: 'Чётко и по делу', icon: '↗' },
  { value: 'direct', label: 'Требовательно', icon: '✦' },
];
const MOTIVATORS = [
  { value: 'meaning', label: 'Понимать смысл', icon: '◌' },
  { value: 'progress', label: 'Видеть прогресс', icon: '↗' },
  { value: 'challenge', label: 'Чувствовать вызов', icon: '✦' },
  { value: 'support', label: 'Получать поддержку', icon: '♡' },
];

function emptyApp() {
  return { profile: null, health: { samples: [], source: null, connected: false }, notes: [], ai: null };
}

function readApp() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyApp();
    const parsed = JSON.parse(raw);
    return { ...emptyApp(), ...parsed, health: { ...emptyApp().health, ...(parsed.health || {}) } };
  } catch {
    return emptyApp();
  }
}

function App() {
  const [app, setApp] = useState(readApp);
  const [activeView, setActiveView] = useState('overview');
  const [toast, setToast] = useState('');
  const [showLog, setShowLog] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [garminLoading, setGarminLoading] = useState(false);
  const importInput = useRef(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(app));
  }, [app]);

  useEffect(() => {
    if (!app.profile) return;
    fetch('/api/garmin/status')
      .then((response) => response.ok ? response.json() : null)
      .then((status) => {
        if (status?.connected && !app.health.connected) {
          setApp((current) => ({ ...current, health: { ...current.health, connected: true, source: 'garmin-api' } }));
        }
      })
      .catch(() => {});
  }, [app.profile]);

  const notify = (message, type = 'success') => {
    setToast({ message, type });
    window.clearTimeout(window.__novaToast);
    window.__novaToast = window.setTimeout(() => setToast(''), 3600);
  };

  const updateApp = (patch) => setApp((current) => ({ ...current, ...patch }));
  const navigate = (view) => {
    setActiveView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const addManualSample = (sample) => {
    const nextSample = { ...sample, source: 'manual', recordedAt: new Date().toISOString() };
    const nextNotes = sample.note?.trim()
      ? [{ id: Date.now(), text: sample.note.trim(), createdAt: new Date().toISOString() }, ...(app.notes || [])]
      : app.notes;
    delete nextSample.note;
    updateApp({ health: { ...app.health, samples: [nextSample, ...(app.health.samples || [])], latest: nextSample, source: 'manual' }, notes: nextNotes, ai: null });
    notify('Запись сохранена. Теперь Nova видит новый контекст.');
    setShowLog(false);
  };

  const importGarminFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = parseGarminFile(text, file.name);
      if (!parsed.length) throw new Error('В файле не найдены поддерживаемые показатели');
      const samples = parsed.map((sample) => ({ ...sample, source: 'garmin-file', recordedAt: new Date().toISOString() }));
      updateApp({ health: { ...app.health, samples: [...samples, ...(app.health.samples || [])], latest: samples[0], source: 'garmin-file', connected: false }, ai: null });
      notify(`Импортировано записей: ${samples.length}. Данные помечены как Garmin-файл.`);
    } catch (error) {
      notify(error.message || 'Не получилось прочитать файл Garmin', 'error');
    }
  };

  const connectGarmin = async () => {
    setGarminLoading(true);
    try {
      const response = await fetch('/api/garmin/start');
      const data = await response.json().catch(() => ({}));
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      notify(data.message || 'Garmin API пока не настроен на сервере.', 'error');
    } catch {
      notify('Сервер интеграции Garmin недоступен. Можно импортировать свой JSON-файл.', 'error');
    } finally {
      setGarminLoading(false);
    }
  };

  const syncGarmin = async () => {
    setGarminLoading(true);
    try {
      const response = await fetch('/api/garmin/sync', { method: 'POST' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Не удалось синхронизировать Garmin');
      const samples = data.samples || [];
      updateApp({ health: { ...app.health, samples: [...samples, ...(app.health.samples || [])], latest: samples[0] || app.health.latest, source: 'garmin-api', connected: true, syncedAt: new Date().toISOString() }, ai: null });
      notify(samples.length ? `Garmin обновлён: новых записей ${samples.length}.` : 'Garmin подключён, но новых записей пока нет.');
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setGarminLoading(false);
    }
  };

  const analyzeWithAi = async () => {
    if (!app.profile) return;
    if (!app.health?.samples?.length && !app.notes?.length) {
      notify('Добавь запись с часов или заметку — AI сможет анализировать только твои данные.', 'error');
      return;
    }
    setAiLoading(true);
    try {
      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile: app.profile, health: app.health, notes: app.notes }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'AI-сервис не настроен');
      updateApp({ ai: { ...data, createdAt: new Date().toISOString() } });
      notify('Анализ готов. Nova использовала только твой профиль и записи.');
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setAiLoading(false);
    }
  };

  const addNote = (text) => {
    if (!text.trim()) return;
    const note = { id: Date.now(), text: text.trim(), createdAt: new Date().toISOString() };
    updateApp({ notes: [note, ...(app.notes || [])], ai: null });
    notify('Заметка добавлена в контекст Nova.');
  };

  const deleteAllData = () => {
    localStorage.removeItem(STORAGE_KEY);
    setApp(emptyApp());
    setActiveView('overview');
    setShowEditProfile(false);
    notify('Локальные данные удалены. Можно начать заново.');
  };

  if (!app.profile) return <Onboarding onComplete={(profile) => updateApp({ profile, health: emptyApp().health, notes: [], ai: null })} notify={notify} />;

  const latest = getLatestSample(app.health?.samples || []);
  return (
    <div className="app-shell">
      <Sidebar activeView={activeView} onNavigate={navigate} profile={app.profile} health={app.health} onConnect={connectGarmin} onSync={syncGarmin} />
      <main className="main-content">
        <Topbar activeView={activeView} onLog={() => setShowLog(true)} onNotify={notify} />
        {activeView === 'overview' && <Overview app={app} latest={latest} onNavigate={navigate} onLog={() => setShowLog(true)} onConnect={connectGarmin} onSync={syncGarmin} onImport={() => importInput.current?.click()} onAnalyze={analyzeWithAi} aiLoading={aiLoading} garminLoading={garminLoading} />}
        {activeView === 'knowledge' && <Knowledge app={app} onAnalyze={analyzeWithAi} aiLoading={aiLoading} onNavigate={navigate} />}
        {activeView === 'training' && <Training app={app} latest={latest} onLog={() => setShowLog(true)} onConnect={connectGarmin} onImport={() => importInput.current?.click()} />}
        {activeView === 'analytics' && <Analytics app={app} onAnalyze={analyzeWithAi} aiLoading={aiLoading} onConnect={connectGarmin} />}
        {activeView === 'notes' && <Notes notes={app.notes || []} onAdd={addNote} onAnalyze={analyzeWithAi} aiLoading={aiLoading} />}
        {activeView === 'profile' && <Profile app={app} onEdit={() => setShowEditProfile(true)} onConnect={connectGarmin} onDelete={deleteAllData} />}
      </main>
      <input ref={importInput} type="file" hidden accept=".json,.csv,application/json,text/csv" onChange={importGarminFile} />
      <MobileNav activeView={activeView} onNavigate={navigate} />
      {showLog && <HealthLogModal onClose={() => setShowLog(false)} onSave={addManualSample} />}
      {showEditProfile && <EditProfileModal profile={app.profile} onClose={() => setShowEditProfile(false)} onSave={(profile) => { updateApp({ profile, ai: null }); setShowEditProfile(false); notify('Профиль обновлён.'); }} />}
      {toast && <Toast toast={toast} />}
    </div>
  );
}

function Onboarding({ onComplete, notify }) {
  const [step, setStep] = useState(0);
  const [interestDraft, setInterestDraft] = useState('');
  const [form, setForm] = useState({ name: '', age: '', profession: '', level: '', interests: [], targetProfession: '', learningGoal: '', workDays: [], workStart: '', workEnd: '', wakeTime: '', sleepTime: '', trainingDays: [], trainingGoal: '', coachStyle: '', motivation: '', dataChoice: 'later', consent: false });
  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const toggleArray = (field, value) => setForm((current) => ({ ...current, [field]: current[field].includes(value) ? current[field].filter((item) => item !== value) : [...current[field], value] }));
  const addInterest = (value = interestDraft) => {
    const clean = value.trim();
    if (!clean || form.interests.includes(clean)) return setInterestDraft('');
    setForm((current) => ({ ...current, interests: [...current.interests, clean] }));
    setInterestDraft('');
  };
  const validate = () => {
    if (step === 0 && (!form.name.trim() || !form.age || !form.profession.trim() || !form.level)) return 'Заполни имя, возраст, профессию и текущий уровень.';
    if (step === 1 && (!form.interests.length || !form.learningGoal.trim())) return 'Добавь хотя бы один интерес и напиши, чему хочешь научиться.';
    if (step === 2 && (!form.workDays.length || !form.workStart || !form.workEnd || !form.wakeTime || !form.sleepTime || !form.trainingGoal.trim() || !form.coachStyle || !form.motivation)) return 'Укажи свой реальный ритм и способ мотивации — это нужно для точных рекомендаций.';
    if (step === 3 && !form.consent) return 'Подтверди, что понимаешь: данные остаются твоими и используются для персонализации.';
    return '';
  };
  const next = () => { const error = validate(); if (error) return notify(error, 'error'); setStep((current) => Math.min(current + 1, 3)); };
  const finish = () => {
    const error = validate();
    if (error) return notify(error, 'error');
    onComplete({ ...form, age: Number(form.age), createdAt: new Date().toISOString(), id: `user-${Date.now()}` });
  };

  return (
    <div className="onboarding-shell">
      <aside className="onboarding-aside">
        <Brand />
        <div className="onboarding-aside-copy"><span className="onboarding-overline">Твой личный ритм</span><h1>Никаких<br /><em>чужих</em><br />данных.</h1><p>Nova строит рекомендации только из того, что ты сам рассказал и подключил.</p></div>
        <div className="onboarding-orbit"><div className="orbit-circle orbit-one"></div><div className="orbit-circle orbit-two"></div><span className="orbit-star">✦</span><span className="orbit-label">your<br />context</span></div>
        <div className="aside-foot"><ShieldCheck size={14} /> Данные принадлежат тебе</div>
      </aside>
      <main className="onboarding-main">
        <div className="onboarding-top"><span>Настройка Nova</span><span>Шаг {step + 1} из 4</span></div>
        <div className="step-progress"><span style={{ width: `${((step + 1) / 4) * 100}%` }}></span></div>
        <div className="onboarding-form-wrap">
          {step === 0 && <StepIdentity form={form} setField={setField} />}
          {step === 1 && <StepInterests form={form} setField={setField} interestDraft={interestDraft} setInterestDraft={setInterestDraft} addInterest={addInterest} />}
          {step === 2 && <StepRhythm form={form} setField={setField} toggleArray={toggleArray} />}
          {step === 3 && <StepData form={form} setField={setField} />}
        </div>
        <div className="onboarding-actions"><button className="back-button" onClick={() => step === 0 ? null : setStep((current) => current - 1)} disabled={step === 0}><ChevronLeft size={16} /> Назад</button>{step < 3 ? <button className="onboarding-next" onClick={next}>Продолжить <ChevronRight size={16} /></button> : <button className="onboarding-next" onClick={finish}><Sparkles size={16} /> Создать мой Nova</button>}</div>
        <p className="onboarding-privacy"><ShieldCheck size={13} /> Можно изменить или удалить всё в «Профиле и данных»</p>
      </main>
    </div>
  );
}

function Brand() {
  return <div className="brand-wrap onboarding-brand"><div className="brand-mark"><span></span><span></span><span></span></div><div><div className="brand-name">nova</div><div className="brand-subtitle">your adaptive rhythm</div></div></div>;
}

function StepIdentity({ form, setField }) {
  return <div className="onboarding-step"><span className="form-eyebrow">01 · Контекст</span><h2>Начнём с тебя.</h2><p className="form-lead">Расскажи о себе — Nova не будет подставлять чужие цели и показатели.</p><div className="form-grid two"><Field label="Как тебя зовут?" required><input value={form.name} onChange={(e) => setField('name', e.target.value)} placeholder="Имя или никнейм" autoFocus /></Field><Field label="Сколько тебе лет?" required><input type="number" min="12" max="100" value={form.age} onChange={(e) => setField('age', e.target.value)} placeholder="Возраст" /></Field></div><Field label="Чем ты занимаешься?" required><input value={form.profession} onChange={(e) => setField('profession', e.target.value)} placeholder="Например, дизайнер, студент, предприниматель" /></Field><Field label="Кем хочешь стать или что улучшить?"><input value={form.targetProfession} onChange={(e) => setField('targetProfession', e.target.value)} placeholder="Профессия, проект или направление" /></Field><div className="field-block"><label>Твой уровень в новых темах <span>*</span></label><div className="choice-grid">{LEVELS.map((level) => <button type="button" className={`choice-card ${form.level === level.value ? 'selected' : ''}`} key={level.value} onClick={() => setField('level', level.value)}><span className="choice-check">{form.level === level.value && <Check size={12} />}</span><strong>{level.label}</strong><small>{level.text}</small></button>)}</div></div></div>;
}

function StepInterests({ form, setField, interestDraft, setInterestDraft, addInterest }) {
  return <div className="onboarding-step"><span className="form-eyebrow">02 · Интересы</span><h2>Что должно стать<br /><em>важным</em> для тебя?</h2><p className="form-lead">Добавь сферы, профессии и темы. На их основе Nova будет собирать знания и практику.</p><div className="interest-input-wrap"><Sparkles size={17} /><input value={interestDraft} onChange={(e) => setInterestDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addInterest()} placeholder="Напиши свой интерес и нажми Enter" /><button type="button" onClick={() => addInterest()}><Plus size={16} /></button></div><div className="suggestions"><span>Можно выбрать:</span>{INTEREST_SUGGESTIONS.map((item) => <button type="button" key={item} className={form.interests.includes(item) ? 'picked' : ''} onClick={() => addInterest(item)}>{form.interests.includes(item) && <Check size={12} />}{item}</button>)}</div><div className="selected-interests">{form.interests.map((item) => <span key={item}>{item}<button type="button" onClick={() => setField('interests', form.interests.filter((interest) => interest !== item))}><X size={12} /></button></span>)}</div><Field label="Чему хочешь научиться в ближайшие 3 месяца?" required><textarea value={form.learningGoal} onChange={(e) => setField('learningGoal', e.target.value)} placeholder="Например: понять, как создавать AI-продукты и собрать первый прототип" /></Field><Field label="Какая цель по физической форме или тренировкам?"><textarea value={form.trainingGoal} onChange={(e) => setField('trainingGoal', e.target.value)} placeholder="Например: подготовиться к забегу, стать сильнее, восстановить режим" /></Field></div>;
}

function StepRhythm({ form, setField, toggleArray }) {
  return <div className="onboarding-step"><span className="form-eyebrow">03 · Ритм жизни</span><h2>Подстроим план<br /><em>под реальную жизнь.</em></h2><p className="form-lead">Не меняй свой график ради приложения. Покажи, где уже есть место для тебя.</p><div className="field-block"><label>В какие дни ты обычно работаешь или учишься? <span>*</span></label><div className="day-picker">{DAYS.map((day) => <button type="button" className={form.workDays.includes(day) ? 'selected' : ''} key={day} onClick={() => toggleArray('workDays', day)}>{day}</button>)}</div></div><div className="form-grid two"><Field label="Начало работы / учёбы" required><input type="time" value={form.workStart} onChange={(e) => setField('workStart', e.target.value)} /></Field><Field label="Конец работы / учёбы" required><input type="time" value={form.workEnd} onChange={(e) => setField('workEnd', e.target.value)} /></Field><Field label="Во сколько обычно встаёшь?" required><input type="time" value={form.wakeTime} onChange={(e) => setField('wakeTime', e.target.value)} /></Field><Field label="Во сколько хочешь ложиться?" required><input type="time" value={form.sleepTime} onChange={(e) => setField('sleepTime', e.target.value)} /></Field></div><div className="field-block"><label>В какие дни обычно тренируешься?</label><div className="day-picker training-day-picker">{DAYS.map((day) => <button type="button" className={form.trainingDays.includes(day) ? 'selected' : ''} key={day} onClick={() => toggleArray('trainingDays', day)}>{day}</button>)}</div></div><Field label="Как с тобой лучше разговаривать?" required><div className="coach-choices">{COACH_STYLES.map((style) => <button type="button" className={form.coachStyle === style.value ? 'selected' : ''} key={style.value} onClick={() => setField('coachStyle', style.value)}><b>{style.icon}</b><span>{style.label}</span></button>)}</div></Field><Field label="Что тебя обычно двигает?" required><div className="coach-choices motivator-choices">{MOTIVATORS.map((item) => <button type="button" className={form.motivation === item.value ? 'selected' : ''} key={item.value} onClick={() => setField('motivation', item.value)}><b>{item.icon}</b><span>{item.label}</span></button>)}</div></Field></div>;
}

function StepData({ form, setField }) {
  return <div className="onboarding-step"><span className="form-eyebrow">04 · Данные</span><h2>Откуда брать<br /><em>твой сигнал?</em></h2><p className="form-lead">Подключи Garmin или начни с ручных записей. В профиле всегда будет видно источник каждого показателя.</p><div className="data-source-choices"><button type="button" className={`data-source-card ${form.dataChoice === 'garmin' ? 'selected' : ''}`} onClick={() => setField('dataChoice', 'garmin')}><span className="data-source-icon garmin"><Watch size={22} /></span><span><strong>Garmin Connect</strong><small>Синхронизация через официальный Garmin API после настройки доступа.</small></span><i>{form.dataChoice === 'garmin' && <Check size={14} />}</i></button><button type="button" className={`data-source-card ${form.dataChoice === 'manual' ? 'selected' : ''}`} onClick={() => setField('dataChoice', 'manual')}><span className="data-source-icon manual"><Pencil size={19} /></span><span><strong>Вводить вручную</strong><small>Сон, пульс, HRV, шаги и тренировки — только то, что ты сам добавишь.</small></span><i>{form.dataChoice === 'manual' && <Check size={14} />}</i></button><button type="button" className={`data-source-card ${form.dataChoice === 'later' ? 'selected' : ''}`} onClick={() => setField('dataChoice', 'later')}><span className="data-source-icon later"><Clock3 size={20} /></span><span><strong>Подключить позже</strong><small>Сейчас создам профиль, а источник данных выберу внутри приложения.</small></span><i>{form.dataChoice === 'later' && <Check size={14} />}</i></button></div><label className="consent-row"><input type="checkbox" checked={form.consent} onChange={(e) => setField('consent', e.target.checked)} /><span className="fake-checkbox">{form.consent && <Check size={13} />}</span><span>Я понимаю, что Nova использует только мои введённые и подключённые данные. Медицинских диагнозов приложение не ставит.</span></label></div>;
}

function Field({ label, required, children }) { return <div className="field-block"><label>{label} {required && <span>*</span>}</label>{children}</div>; }

function Sidebar({ activeView, onNavigate, profile, health, onConnect, onSync }) {
  const hasData = health?.samples?.length > 0;
  return <aside className="sidebar"><Brand /><div className="side-label">Пространство</div><nav className="side-nav">{NAV_ITEMS.map((item) => <NavItem item={item} active={activeView === item.id} onClick={() => onNavigate(item.id)} key={item.id} />)}</nav><div className="side-label second-label">Твоя система</div><nav className="side-nav">{SYSTEM_ITEMS.map((item) => <NavItem item={item} active={activeView === item.id} onClick={() => onNavigate(item.id)} key={item.id} />)}</nav><div className="side-spacer" /><button className={`sidebar-source ${health?.connected ? 'connected' : ''}`} onClick={health?.connected ? onSync : onConnect}><span className="source-icon"><Watch size={15} /></span><span><strong>{health?.connected ? 'Garmin подключён' : 'Подключить Garmin'}</strong><small>{health?.connected ? 'нажми для синхронизации' : hasData ? 'или импортировать файл' : 'данных пока нет'}</small></span><ChevronRight size={14} /></button><div className="sidebar-profile" onClick={() => onNavigate('profile')}><div className="avatar avatar-small">{getInitials(profile.name)}</div><div><strong>{profile.name}</strong><span>{profile.profession}</span></div><ChevronRight size={14} /></div><div className="sidebar-disclaimer"><ShieldCheck size={12} /> Владелец данных — ты</div></aside>;
}

function NavItem({ item, active, onClick }) { const Icon = item.icon; return <button className={`nav-item ${active ? 'active' : ''}`} onClick={onClick}><Icon size={17} /><span>{item.label}</span>{active && <i className="nav-active-dot" />}</button>; }

function MobileNav({ activeView, onNavigate }) { return <nav className="mobile-nav">{NAV_ITEMS.slice(0, 4).map((item) => { const Icon = item.icon; return <button key={item.id} className={activeView === item.id ? 'active' : ''} onClick={() => onNavigate(item.id)}><Icon size={19} /><span>{item.label}</span></button>; })}</nav>; }

function Topbar({ activeView, onLog, onNotify }) {
  const labels = { overview: 'Обзор', knowledge: 'Знания', training: 'Тренировки', analytics: 'Аналитика', notes: 'Мои заметки', profile: 'Профиль и данные' };
  const date = new Intl.DateTimeFormat('ru-RU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
  return <header className="topbar"><div className="topbar-context"><span className="context-dot"></span><span>{date}</span><ChevronRight size={13} /><strong>{labels[activeView]}</strong></div><div className="topbar-actions"><button className="icon-button" onClick={() => onNotify('Поиск будет искать только в твоих данных')}><Search size={17} /></button><button className="icon-button notification-button" onClick={() => onNotify('Новых уведомлений нет')}><Bell size={17} /><i></i></button><button className="quick-log-button" onClick={onLog}><Plus size={15} /><span>Добавить данные</span></button><div className="avatar avatar-top">Nova</div></div></header>;
}

function PageTitle({ eyebrow, title, description, action }) { return <div className="page-title-row"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{action && <button className="outline-button" onClick={action.onClick}>{action.icon && <action.icon size={15} />}{action.label}</button>}</div>; }

function Overview({ app, latest, onNavigate, onLog, onConnect, onSync, onImport, onAnalyze, aiLoading, garminLoading }) {
  const firstName = app.profile.name.split(/\s+/)[0];
  const hasData = Boolean(latest);
  return <div className="page"><PageTitle eyebrow={`Привет, ${firstName}`} title="Твой день, без догадок." description="Здесь только твой профиль, твои записи и данные с твоих устройств." action={{ label: 'Добавить запись', icon: Plus, onClick: onLog }} /><DataConnectionCard health={app.health} latest={latest} onConnect={onConnect} onSync={onSync} onImport={onImport} loading={garminLoading} /><section className="metrics-grid user-metrics"><UserMetric icon={Gauge} tone="violet" label="Готовность" value={latest?.readiness} suffix="/ 100" source={latest?.source} helper="появится после анализа AI" /><UserMetric icon={Moon} tone="blue" label="Сон" value={latest?.sleepHours} suffix="ч" source={latest?.source} helper="добавь запись с часов" /><UserMetric icon={HeartPulse} tone="orange" label="Пульс покоя" value={latest?.restingHeartRate} suffix="уд/мин" source={latest?.source} helper="нет данных" /><UserMetric icon={Footprints} tone="green" label="Шаги" value={latest?.steps} suffix="" source={latest?.source} helper="нет данных" /></section><section className="dashboard-content-grid"><FocusFromProfile profile={app.profile} onNavigate={onNavigate} /><AiCard app={app} onAnalyze={onAnalyze} loading={aiLoading} onNavigate={onNavigate} /></section><section className="dashboard-content-grid lower-grid"><TodayPlan profile={app.profile} onNavigate={onNavigate} /><NotesPreview notes={app.notes} onNavigate={onNavigate} /></section>{!hasData && <div className="no-data-footnote"><CircleHelp size={14} /> Nova не показывает оценку готовности, пока не получит хотя бы одну твою запись.</div>}</div>;
}

function DataConnectionCard({ health, latest, onConnect, onSync, onImport, loading }) {
  const connected = health?.connected;
  return <section className={`connection-card ${connected ? 'is-connected' : ''}`}><div className="connection-visual"><div className="connection-orbit orbit-a"></div><div className="connection-orbit orbit-b"></div><div className="connection-center"><Watch size={26} /></div></div><div className="connection-copy"><span className="section-kicker"><span className={`tiny-dot ${connected ? 'green' : 'orange'}`}></span> Источник данных</span><h2>{connected ? 'Garmin подключён.' : latest ? 'Есть твоя первая запись.' : 'Подключи Garmin, чтобы видеть реальную картину.'}</h2><p>{connected ? `Последняя синхронизация: ${formatDate(health.syncedAt || latest?.recordedAt)}. Nova будет брать данные только из разрешённых тобой категорий.` : latest ? `Сейчас отображается ${sourceLabel(latest.source)}. Ты можешь добавить ещё данные или подключить Garmin.` : 'Сон, пульс, HRV, шаги и тренировки попадут сюда только после подключения или твоего ручного ввода.'}</p><div className="connection-actions">{connected ? <button className="primary-button" onClick={onSync} disabled={loading}><RefreshCw size={14} className={loading ? 'spin' : ''} /> {loading ? 'Синхронизация…' : 'Синхронизировать'}</button> : <button className="primary-button" onClick={onConnect} disabled={loading}><Watch size={14} /> {loading ? 'Проверяем доступ…' : 'Подключить Garmin'}</button>}<button className="ghost-button" onClick={onImport}><FileText size={14} /> Импорт JSON / CSV</button></div></div><div className="connection-status"><span className={connected ? 'status-chip connected' : 'status-chip'}>{connected ? 'подключено' : 'не подключено'}</span><small>{connected ? 'официальный источник' : 'нет неизвестных значений'}</small></div></section>;
}

function UserMetric({ icon: Icon, tone, label, value, suffix, source, helper }) { const has = value !== undefined && value !== null && value !== ''; return <article className="metric-card user-metric"><div className={`metric-icon ${tone}`}><Icon size={17} /></div><div className="metric-heading"><span>{label}</span><ArrowUpRight size={14} /></div><div className={`metric-value ${has ? '' : 'empty'}`}>{has ? formatMetric(value) : '—'}<small>{has ? suffix : ''}</small></div><div className="metric-foot"><span className={`metric-source ${has ? '' : 'muted'}`}>{has ? sourceLabel(source) : 'Нет записи'}</span><span>{has ? 'из твоих данных' : helper}</span></div></article>; }

function FocusFromProfile({ profile, onNavigate }) { const interest = profile.interests?.[0] || 'выбранные интересы'; return <article className="focus-card card-surface profile-focus"><div className="section-heading"><div><span className="section-kicker"><span className="tiny-dot purple"></span> Твой фокус</span><h3>Nova начнёт с твоего запроса</h3></div><button className="more-button" onClick={() => onNavigate('profile')}><Pencil size={15} /></button></div><div className="focus-empty"><div className="empty-visual"><Sparkles size={23} /><span></span><i></i></div><div><span className="soft-tag">Из твоей анкеты</span><h4>{profile.learningGoal}</h4><p>Направление: <strong>{interest}</strong>{profile.targetProfession ? ` · цель: ${profile.targetProfession}` : ''}</p><button className="text-button" onClick={() => onNavigate('knowledge')}>Открыть пространство знаний <ChevronRight size={14} /></button></div></div><div className="focus-footer"><span><ShieldCheck size={13} /> Без автоматически добавленных тем</span><button onClick={() => onNavigate('profile')}>Изменить интересы <ChevronRight size={14} /></button></div></article>; }

function AiCard({ app, onAnalyze, loading, onNavigate }) { const hasInput = app.health?.samples?.length || app.notes?.length; return <article className="ai-card card-surface"><div className="ai-card-top"><div className="coach-avatar"><Sparkles size={15} /></div><span>Nova AI</span><span className="ai-status"><i></i> {app.ai ? 'анализ готов' : 'ждёт данные'}</span></div>{app.ai ? <div className="ai-result"><span className="section-kicker">Последний персональный вывод</span><h3>{app.ai.summary || 'Анализ сохранён.'}</h3>{app.ai.nextStep && <p><strong>Следующий шаг:</strong> {app.ai.nextStep}</p>}</div> : <div className="ai-empty"><div className="ai-empty-mark"><Brain size={21} /></div><h3>AI будет опираться<br />на твой контекст.</h3><p>{hasInput ? 'Нажми анализ — Nova сопоставит данные Garmin, записи и цели из анкеты.' : 'Сначала добавь данные с часов или свою заметку. Никаких предположений.'}</p></div>}<div className="ai-card-bottom"><button className="text-button" onClick={hasInput ? onAnalyze : () => onNavigate('notes')} disabled={loading}>{loading ? <RefreshCw size={14} className="spin" /> : <MessageCircle size={14} />}{loading ? 'Анализирую…' : hasInput ? 'Запустить анализ' : 'Добавить контекст'}</button><span className="ai-lock"><ShieldCheck size={12} /> только твои данные</span></div></article>; }

function TodayPlan({ profile, onNavigate }) { const work = profile.workStart && profile.workEnd ? `${profile.workStart}–${profile.workEnd}` : 'график не задан'; const training = profile.trainingDays?.length ? profile.trainingDays.join(' · ') : 'дни тренировок не заданы'; return <article className="day-plan card-surface"><div className="section-heading"><div><span className="section-kicker"><span className="tiny-dot orange"></span> Ритм дня</span><h3>План из твоих настроек</h3></div><button className="more-button" onClick={() => onNavigate('profile')}><Pencil size={15} /></button></div><div className="user-plan-list"><PlanLine icon={Clock3} tone="blue" title="Работа / учёба" detail={work} /><PlanLine icon={Dumbbell} tone="orange" title="Тренировки" detail={training} /><PlanLine icon={Moon} tone="slate" title="Сон" detail={`${profile.sleepTime || 'не задано'} — ${profile.wakeTime || 'не задано'}`} /></div><button className="add-plan-button" onClick={() => onNavigate('profile')}><SlidersHorizontal size={14} /> Настроить ритм</button></article>; }
function PlanLine({ icon: Icon, tone, title, detail }) { return <div className="plan-item static"><span className={`plan-icon ${tone}`}><Icon size={15} /></span><span className="plan-copy"><strong>{title}</strong><small>{detail}</small></span><ChevronRight size={14} /></div>; }

function NotesPreview({ notes, onNavigate }) { const latest = notes?.slice(0, 2) || []; return <article className="notes-preview card-surface"><div className="section-heading"><div><span className="section-kicker"><span className="tiny-dot blue"></span> Личный контекст</span><h3>Последние заметки</h3></div><button className="more-button" onClick={() => onNavigate('notes')}><ArrowUpRight size={16} /></button></div>{latest.length ? <div className="preview-notes">{latest.map((note) => <div className="preview-note" key={note.id}><span className="note-bullet"></span><div><small>{formatDate(note.createdAt)}</small><p>{note.text}</p></div></div>)}</div> : <div className="small-empty"><FileText size={18} /><p>Ты ещё ничего не записал.<br />Любая деталь поможет AI понять контекст.</p></div>}<button className="text-button" onClick={() => onNavigate('notes')}><Plus size={14} /> Добавить заметку</button></article>; }

function Knowledge({ app, onAnalyze, aiLoading, onNavigate }) { const interests = app.profile.interests || []; return <div className="page"><PageTitle eyebrow="Твой маршрут" title="Знания, которые выбрал ты." description="Nova не добавляет курсы сама. Сначала — твои темы, затем — подтверждённые источники и практика." action={{ label: 'Изменить интересы', icon: Pencil, onClick: () => onNavigate('profile') }} /><section className="knowledge-hero"><div><span className="section-kicker"><Sparkles size={14} /> Персонализация готова</span><h2>{app.profile.learningGoal}</h2><p>Уровень: <strong>{levelLabel(app.profile.level)}</strong>. Профессия / направление: <strong>{app.profile.targetProfession || 'ты пока не указал'}</strong>.</p><button className="light-pill-button" onClick={onAnalyze} disabled={aiLoading}>{aiLoading ? <RefreshCw size={14} className="spin" /> : <Brain size={14} />}{aiLoading ? 'Анализирую…' : 'Собрать рекомендации AI'}</button></div><div className="knowledge-hero-orbit"><div></div><strong>{interests.length}</strong><small>твоих<br />тем</small></div></section><section className="knowledge-grid"><article className="knowledge-interests card-surface"><div className="section-heading"><div><span className="section-kicker"><span className="tiny-dot purple"></span> Введено тобой</span><h3>Твои интересы</h3></div><button className="more-button" onClick={() => onNavigate('profile')}><Pencil size={15} /></button></div><div className="interest-cloud">{interests.map((item) => <span key={item}>{item}</span>)}</div><div className="knowledge-note"><ShieldCheck size={14} /><p>Здесь нет случайных тем. Nova будет искать материалы только вокруг этих интересов.</p></div></article><article className="knowledge-empty card-surface"><div className="empty-illustration"><BookOpen size={24} /><div></div></div><span className="section-kicker">Материалы ещё не добавлены</span><h3>Сначала подключи AI-источник.</h3><p>Чтобы выдавать обновляемые курсы и ссылки, добавь AI API на сервере. Пока здесь не будет выдуманных рекомендаций.</p><button className="outline-button" onClick={onAnalyze} disabled={aiLoading}><CircleHelp size={15} /> Как подключить AI</button></article></section><section className="practice-empty"><div className="practice-icon"><Target size={20} /></div><div><span className="section-kicker">Практика</span><h3>Задания появятся после первого AI-анализа.</h3><p>Nova будет проверять теорию, объяснять ошибки и возвращать материал в нужный момент.</p></div><button className="dark-action" onClick={() => onNavigate('notes')}><Plus size={15} /> Добавить контекст</button></section></div>; }

function Training({ app, latest, onLog, onConnect, onImport }) { const days = app.profile.trainingDays || []; return <div className="page"><PageTitle eyebrow="Движение и восстановление" title="Тренируйся по своим сигналам." description="Здесь нет готовой оценки. Она появится только после Garmin или твоих записей." action={{ label: 'Добавить тренировку', icon: Plus, onClick: onLog }} /><section className="training-top-grid"><article className="training-empty card-surface"><div className="empty-visual large"><Dumbbell size={25} /><span></span><i></i></div><div><span className="section-kicker"><span className="tiny-dot orange"></span> Готовность к нагрузке</span><h2>{latest?.readiness ? `Готовность ${formatMetric(latest.readiness)} / 100` : 'Пока недостаточно данных.'}</h2><p>{latest?.readiness ? 'Это значение рассчитано по твоей последней записи.' : 'Подключи Garmin или добавь сон, пульс и тренировку вручную — AI сможет дать рекомендацию.'}</p><button className="primary-button" onClick={latest ? onLog : onConnect}><Watch size={15} /> {latest ? 'Добавить запись' : 'Подключить Garmin'}</button></div></article><article className="training-plan-card"><div className="recommendation-top"><span className="section-kicker"><Sparkles size={14} /> Твой план</span><Pencil size={14} /></div><h3>{app.profile.trainingGoal}</h3><p>Тренировочные дни: {days.length ? days.join(' · ') : 'ты пока не указал'}</p><div className="plan-warning"><CircleHelp size={14} /><span>Без данных с часов Nova не будет назначать интенсивность.</span></div><button className="ghost-light-button" onClick={onImport}><FileText size={14} /> Импортировать файл Garmin</button></article></section><section className="training-data-card card-surface"><div className="section-heading"><div><span className="section-kicker"><span className="tiny-dot green"></span> Введённые показатели</span><h3>История сигналов</h3></div><span className="result-count">{app.health?.samples?.length || 0} записей</span></div>{app.health?.samples?.length ? <div className="data-table">{app.health.samples.slice(0, 6).map((sample, index) => <div className="data-row" key={`${sample.recordedAt}-${index}`}><span>{formatDate(sample.date || sample.recordedAt)}</span><b>{sample.sleepHours !== undefined ? `${sample.sleepHours}ч сна` : 'сон —'}</b><b>{sample.restingHeartRate !== undefined ? `${sample.restingHeartRate} уд/мин` : 'пульс —'}</b><b>{sample.steps !== undefined ? `${formatMetric(sample.steps)} шагов` : 'шаги —'}</b><small>{sourceLabel(sample.source)}</small></div>)}</div> : <EmptyState icon={Watch} title="История пока пустая" text="Подключи Garmin или добавь первую запись, чтобы видеть динамику." action="Добавить вручную" onClick={onLog} />}</section></div>; }

function Analytics({ app, onAnalyze, aiLoading, onConnect }) { const samples = [...(app.health?.samples || [])].slice(0, 12).reverse(); const readinessValues = samples.map((sample) => Number(sample.readiness)).filter(Number.isFinite); const max = Math.max(...readinessValues, 100); return <div className="page"><PageTitle eyebrow="Твои данные" title="Смотри на динамику, не на догадки." description="Каждая точка на графике пришла из твоих записей или Garmin." action={{ label: 'Запустить AI-анализ', icon: Brain, onClick: onAnalyze }} />{samples.length ? <><section className="analytics-summary"><SummaryCard icon={Gauge} tone="purple" label="Последняя готовность" value={lastValue(app.health.samples, 'readiness')} suffix="/ 100" source={app.health.samples[0]?.source} /><SummaryCard icon={Moon} tone="blue" label="Последний сон" value={lastValue(app.health.samples, 'sleepHours')} suffix="ч" source={app.health.samples[0]?.source} /><SummaryCard icon={HeartPulse} tone="orange" label="Пульс покоя" value={lastValue(app.health.samples, 'restingHeartRate')} suffix="уд/мин" source={app.health.samples[0]?.source} /><SummaryCard icon={Footprints} tone="green" label="Шаги" value={lastValue(app.health.samples, 'steps')} suffix="" source={app.health.samples[0]?.source} /></section><section className="analytics-chart-card card-surface"><div className="chart-card-header"><div><span className="section-kicker"><span className="tiny-dot purple"></span> Фактические записи</span><h3>Готовность по дням</h3></div><span className="source-chip"><span></span> {sourceLabel(app.health.samples[0]?.source)}</span></div><div className="actual-chart"><div className="chart-grid-lines"><i></i><i></i><i></i><i></i><i></i></div><div className="chart-columns">{samples.map((sample, index) => { const value = Number(sample.readiness); const height = Number.isFinite(value) ? Math.max(4, (value / max) * 100) : 3; return <div className="actual-column" key={`${sample.recordedAt}-${index}`}><span className="bar-value">{Number.isFinite(value) ? formatMetric(value) : '—'}</span><div className={`actual-bar ${sample.source === 'garmin-api' ? 'garmin' : ''}`} style={{ height: `${height}%` }}></div><small>{formatShortDate(sample.date || sample.recordedAt)}</small></div>; })}</div></div><div className="chart-explain"><CircleHelp size={14} /> Если показатель не пришёл с часов, он остаётся пустым — Nova ничего не дорисовывает.</div></section><section className="analytics-ai-card"><div className="ai-card-top"><div className="coach-avatar"><Sparkles size={15} /></div><span>AI-разбор</span></div><div><h3>{app.ai?.summary || 'Анализ ещё не запускался.'}</h3><p>{app.ai?.nextStep || 'Запусти AI-анализ, чтобы сопоставить фактические данные с твоими целями и режимом.'}</p></div><button className="dark-action" onClick={onAnalyze} disabled={aiLoading}>{aiLoading ? 'Анализирую…' : 'Проанализировать'}</button></section></> : <EmptyState icon={BarChart3} title="Пока нечего анализировать" text="Подключи Garmin или добавь несколько ручных записей. Никаких средних значений из воздуха." action="Подключить Garmin" onClick={onConnect} />}</div>; }

function SummaryCard({ icon: Icon, tone, label, value, suffix, source }) { const has = value !== undefined && value !== null && value !== ''; return <article className="summary-card"><div className={`summary-icon ${tone}`}><Icon size={17} /></div><span>{label}</span><div className={`summary-value ${has ? '' : 'empty'}`}>{has ? formatMetric(value) : '—'}<small>{has ? suffix : ''}</small></div><div className="summary-change">{has ? sourceLabel(source) : 'нет записи'}</div></article>; }

function Notes({ notes, onAdd, onAnalyze, aiLoading }) { const [text, setText] = useState(''); const save = () => { onAdd(text); setText(''); }; return <div className="page"><PageTitle eyebrow="Личный контекст" title="Записывай то, что не видят часы." description="Мысль, ощущение, тренировка или причина плохого сна — AI сможет учитывать это рядом с цифрами." action={{ label: 'Запустить AI-анализ', icon: Brain, onClick: onAnalyze }} /><section className="notes-layout"><article className="new-note-card"><div className="note-top"><span className="note-symbol"><Sparkles size={15} /></span><span>Новая заметка</span><span className="note-date">сохраняется только у тебя</span></div><textarea className="note-input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Что происходит сегодня?" /><div className="note-footer"><span className="note-hint"><ShieldCheck size={13} /> Nova использует это только в твоём контексте</span><button className="send-note" onClick={save} disabled={!text.trim()}><Send size={14} /> Сохранить</button></div></article><article className="notes-history card-surface"><div className="section-heading"><div><span className="section-kicker"><span className="tiny-dot blue"></span> История</span><h3>Твои записи</h3></div><span className="result-count">{notes.length}</span></div>{notes.length ? <div className="note-history-list">{notes.map((note) => <div className="history-note" key={note.id}><div className="history-dot"></div><div className="history-copy"><span>{formatDate(note.createdAt)}</span><p>{note.text}</p></div></div>)}</div> : <EmptyState icon={FileText} title="Записей пока нет" text="Добавь контекст, который не попадает в Garmin." />}</article></section><div className="privacy-banner"><ShieldCheck size={17} /><div><strong>Ты контролируешь контекст</strong><p>Заметки, показатели и профиль хранятся в этом браузере, пока ты не подключишь серверную синхронизацию.</p></div><button className="outline-button" onClick={onAnalyze} disabled={aiLoading}>{aiLoading ? 'Анализ…' : 'AI-анализ'}</button></div></div>; }

function Profile({ app, onEdit, onConnect, onDelete }) { const { profile, health } = app; return <div className="page"><PageTitle eyebrow="Твоя система" title="Профиль и источники." description="Проверь, что Nova знает о тебе, и управляй подключениями." action={{ label: 'Изменить анкету', icon: Pencil, onClick: onEdit }} /><section className="profile-grid"><article className="profile-overview card-surface"><div className="profile-large-avatar">{getInitials(profile.name)}</div><h2>{profile.name}</h2><p>{profile.profession}{profile.age ? ` · ${profile.age} лет` : ''}</p><div className="profile-tags">{profile.level && <span>{levelLabel(profile.level)}</span>}{profile.coachStyle && <span>{coachLabel(profile.coachStyle)}</span>}</div><button className="outline-button" onClick={onEdit}><Pencil size={14} /> Редактировать</button></article><article className="profile-details card-surface"><div className="section-heading"><div><span className="section-kicker"><span className="tiny-dot purple"></span> Введено при регистрации</span><h3>Твой контекст</h3></div></div><DetailRow label="Цель обучения" value={profile.learningGoal} /><DetailRow label="Направление" value={profile.targetProfession || 'не указано'} /><DetailRow label="Интересы" value={profile.interests?.join(' · ') || 'не указаны'} /><DetailRow label="Режим" value={`${profile.workStart}–${profile.workEnd} · сон ${profile.sleepTime}–${profile.wakeTime}`} /><DetailRow label="Дни тренировок" value={profile.trainingDays?.join(' · ') || 'не указаны'} /><DetailRow label="Мотивация" value={motivationLabel(profile.motivation)} /></article></section><section className="data-settings card-surface"><div className="section-heading"><div><span className="section-kicker"><span className="tiny-dot orange"></span> Синхронизация</span><h3>Твои источники данных</h3></div><span className={`status-chip ${health?.connected ? 'connected' : ''}`}>{health?.connected ? 'подключено' : 'не подключено'}</span></div><div className="source-setting"><span className="source-icon large"><Watch size={19} /></span><div><strong>Garmin Connect</strong><small>{health?.connected ? 'Официальный API · доступ выдан тобой' : 'Не подключён · никаких данных ещё не получил'}</small></div>{health?.connected ? <button className="outline-button" onClick={onConnect}><RefreshCw size={14} /> Синхронизировать</button> : <button className="primary-button" onClick={onConnect}><Watch size={14} /> Подключить</button>}</div><div className="source-setting manual-source"><span className="source-icon large manual"><Pencil size={17} /></span><div><strong>Ручные записи</strong><small>{app.health?.samples?.filter((sample) => sample.source === 'manual').length || 0} записей добавлено тобой</small></div><span className="status-chip connected">доступно</span></div></section><section className="danger-zone"><div><strong>Удалить все данные</strong><p>Профиль, записи, импорт и AI-анализ будут удалены из этого браузера без возможности восстановления.</p></div><button className="danger-button" onClick={onDelete}><Trash2 size={14} /> Удалить всё</button></section></div>; }
function DetailRow({ label, value }) { return <div className="detail-row"><span>{label}</span><strong>{value}</strong></div>; }

function EmptyState({ icon: Icon, title, text, action, onClick }) { return <div className="empty-state"><div className="empty-state-icon"><Icon size={23} /></div><h3>{title}</h3><p>{text}</p>{action && <button className="primary-button" onClick={onClick}>{action}</button>}</div>; }

function HealthLogModal({ onClose, onSave }) { const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), sleepHours: '', restingHeartRate: '', hrv: '', steps: '', trainingLoad: '', readiness: '', note: '' }); const [error, setError] = useState(''); const set = (key, value) => { setError(''); setForm((current) => ({ ...current, [key]: value })); }; const save = () => { const values = Object.fromEntries(Object.entries(form).map(([key, value]) => [key, ['date', 'note'].includes(key) ? value : value === '' ? undefined : Number(value)])); const hasData = Object.entries(values).some(([key, value]) => key !== 'date' && value !== undefined && value !== ''); if (!hasData) { setError('Добавь хотя бы один показатель или контекст.'); return; } onSave(values); }; return <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}><div className="quick-modal health-modal"><div className="modal-header"><div><span className="eyebrow">Ручная запись</span><h2>Добавь свои показатели.</h2></div><button className="modal-close" onClick={onClose}><X size={17} /></button></div><p className="modal-description">Заполняй только то, что действительно знаешь. Пустые поля останутся пустыми.</p><div className="form-grid two modal-fields"><Field label="Дата"><input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} /></Field><Field label="Сон, часов"><input type="number" step="0.1" min="0" max="24" value={form.sleepHours} onChange={(e) => set('sleepHours', e.target.value)} placeholder="например, 7.5" /></Field><Field label="Пульс покоя"><input type="number" min="20" max="220" value={form.restingHeartRate} onChange={(e) => set('restingHeartRate', e.target.value)} placeholder="уд/мин" /></Field><Field label="HRV"><input type="number" min="0" value={form.hrv} onChange={(e) => set('hrv', e.target.value)} placeholder="мс" /></Field><Field label="Шаги"><input type="number" min="0" value={form.steps} onChange={(e) => set('steps', e.target.value)} placeholder="за день" /></Field><Field label="Нагрузка"><input type="number" min="0" max="100" value={form.trainingLoad} onChange={(e) => set('trainingLoad', e.target.value)} placeholder="0–100" /></Field></div><Field label="Что важно добавить в контекст?"><textarea value={form.note} onChange={(e) => set('note', e.target.value)} placeholder="Например: тяжёлая тренировка, много стресса, проснулся ночью..." /></Field>{error && <p className="modal-error">{error}</p>}<div className="modal-actions"><button className="cancel-button" onClick={onClose}>Отмена</button><button className="save-button" onClick={save}><Check size={15} /> Сохранить показатели</button></div></div></div>; }

function EditProfileModal({ profile, onClose, onSave }) { const [form, setForm] = useState({ ...profile, interestsText: (profile.interests || []).join(', ') }); const set = (key, value) => setForm((current) => ({ ...current, [key]: value })); const save = () => { const interests = form.interestsText.split(',').map((item) => item.trim()).filter(Boolean); onSave({ ...profile, ...form, age: Number(form.age), interests }); }; return <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}><div className="quick-modal edit-modal"><div className="modal-header"><div><span className="eyebrow">Твой профиль</span><h2>Изменить контекст.</h2></div><button className="modal-close" onClick={onClose}><X size={17} /></button></div><div className="form-grid two modal-fields"><Field label="Имя"><input value={form.name} onChange={(e) => set('name', e.target.value)} /></Field><Field label="Возраст"><input type="number" value={form.age} onChange={(e) => set('age', e.target.value)} /></Field></div><Field label="Профессия"><input value={form.profession} onChange={(e) => set('profession', e.target.value)} /></Field><Field label="Цель обучения"><textarea value={form.learningGoal} onChange={(e) => set('learningGoal', e.target.value)} /></Field><Field label="Интересы через запятую"><input value={form.interestsText} onChange={(e) => set('interestsText', e.target.value)} /></Field><div className="modal-actions"><button className="cancel-button" onClick={onClose}>Отмена</button><button className="save-button" onClick={save}><Check size={15} /> Сохранить</button></div></div></div>; }

function Toast({ toast }) { return <div className={`toast ${toast.type === 'error' ? 'error' : ''}`}><span>{toast.type === 'error' ? <CircleHelp size={15} /> : <Check size={15} />}</span>{toast.message}</div>; }

function parseGarminFile(text, filename) {
  let rows = [];
  if (filename.toLowerCase().endsWith('.csv')) rows = parseCsv(text);
  else {
    const json = JSON.parse(text);
    if (Array.isArray(json)) rows = json;
    else if (Array.isArray(json.dailies)) rows = json.dailies;
    else if (Array.isArray(json.dailySummaries)) rows = json.dailySummaries;
    else if (Array.isArray(json.sleeps)) rows = json.sleeps;
    else if (Array.isArray(json.activities)) rows = json.activities;
    else rows = [json];
  }
  return rows.map((row) => normalizeHealthRow(row)).filter((row) => Object.keys(row).some((key) => !['date', 'source'].includes(key) && row[key] !== undefined));
}

function normalizeHealthRow(row) {
  const pick = (...keys) => { for (const key of keys) { const value = row?.[key]; if (value !== undefined && value !== null && value !== '') return value; } return undefined; };
  const toHours = (value) => { if (value === undefined) return undefined; const n = Number(value); if (!Number.isFinite(n)) return undefined; return n > 24 ? Math.round((n / 3600) * 10) / 10 : Math.round(n * 10) / 10; };
  const date = pick('calendarDate', 'date', 'startTimeLocal', 'timestamp', 'day');
  const sleepRaw = pick('sleepHours', 'totalSleepHours', 'sleepDurationHours', 'totalSleepSeconds', 'sleepDuration');
  const steps = numberOrUndefined(pick('steps', 'totalSteps', 'stepCount'));
  return { date: date ? String(date).slice(0, 10) : undefined, sleepHours: toHours(sleepRaw), restingHeartRate: numberOrUndefined(pick('restingHeartRate', 'resting_heart_rate', 'restingHeartRateValue')), hrv: numberOrUndefined(pick('hrv', 'avgHrv', 'averageHrv')), steps, trainingLoad: numberOrUndefined(pick('trainingLoad', 'training_load', 'load')), readiness: numberOrUndefined(pick('readiness', 'trainingReadiness')) };
}

function parseCsv(text) { const lines = text.trim().split(/\r?\n/).filter(Boolean); if (lines.length < 2) return []; const headers = lines[0].split(',').map((header) => header.trim().replace(/^"|"$/g, '')); return lines.slice(1).map((line) => { const values = line.split(',').map((value) => value.trim().replace(/^"|"$/g, '')); return Object.fromEntries(headers.map((header, index) => [header, values[index]])); }); }
function numberOrUndefined(value) { const number = Number(value); return value === undefined || value === null || value === '' || !Number.isFinite(number) ? undefined : number; }
function getLatestSample(samples) { return [...samples].sort((a, b) => new Date(b.date || b.recordedAt || 0) - new Date(a.date || a.recordedAt || 0))[0]; }
function lastValue(samples, key) { return getLatestSample(samples)?.[key]; }
function formatMetric(value) { return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 }).format(Number(value)); }
function formatDate(value) { if (!value) return 'дата не указана'; const date = new Date(value); return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' }).format(date); }
function formatShortDate(value) { if (!value) return '—'; const date = new Date(value); return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' }).format(date); }
function sourceLabel(source) { return source === 'garmin-api' ? 'Garmin API' : source === 'garmin-file' ? 'Garmin-файл' : source === 'manual' ? 'Ручной ввод' : 'Источник не указан'; }
function levelLabel(level) { return { beginner: 'начальный уровень', intermediate: 'уверенный уровень', advanced: 'продвинутый уровень' }[level] || 'уровень не указан'; }
function coachLabel(style) { return { calm: 'бережный тон', balanced: 'по делу', direct: 'требовательный тон' }[style] || style; }
function motivationLabel(value) { return { meaning: 'понимать смысл', progress: 'видеть прогресс', challenge: 'чувствовать вызов', support: 'получать поддержку' }[value] || 'не указано'; }
function getInitials(name = '') { return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'N'; }

createRoot(document.getElementById('root')).render(<App />);
