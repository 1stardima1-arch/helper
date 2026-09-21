import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Activity,
  ArrowDownRight,
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
  CloudSun,
  Dumbbell,
  FileText,
  Flame,
  Footprints,
  Gauge,
  Heart,
  HeartPulse,
  LayoutDashboard,
  Leaf,
  MessageCircle,
  Mic,
  MoreHorizontal,
  Moon,
  Play,
  Plus,
  Search,
  Send,
  Settings,
  SlidersHorizontal,
  Sparkles,
  Target,
  Timer,
  TrendingUp,
  UserRound,
  Watch,
  Waves,
  Wind,
  X,
  Zap,
} from 'lucide-react';
import './styles.css';

const navItems = [
  { id: 'overview', label: 'Обзор', icon: LayoutDashboard },
  { id: 'learning', label: 'Развитие', icon: BookOpen, badge: '3' },
  { id: 'training', label: 'Тренировки', icon: Dumbbell },
  { id: 'analytics', label: 'Аналитика', icon: BarChart3 },
];

const secondaryItems = [
  { id: 'goals', label: 'Мои цели', icon: Target },
  { id: 'schedule', label: 'Расписание', icon: CalendarDays },
  { id: 'notes', label: 'Заметки', icon: FileText },
];

const courseData = [
  {
    id: 1,
    title: 'Системное мышление в AI',
    tag: 'В фокусе',
    category: 'AI & технологии',
    description: 'Как превращать идеи в продукты, которыми хочется пользоваться.',
    progress: 68,
    lessons: '4 из 6 уроков',
    duration: '18 мин',
    color: 'indigo',
    icon: Brain,
  },
  {
    id: 2,
    title: 'Сила привычек',
    tag: 'Для тебя',
    category: 'Саморазвитие',
    description: 'Маленькие изменения, которые остаются надолго.',
    progress: 34,
    lessons: '2 из 7 уроков',
    duration: '12 мин',
    color: 'sand',
    icon: Leaf,
  },
  {
    id: 3,
    title: 'Тренируйся умнее',
    tag: 'Новый',
    category: 'Здоровье',
    description: 'Основы восстановления и адаптации нагрузки.',
    progress: 0,
    lessons: '5 уроков',
    duration: '24 мин',
    color: 'mint',
    icon: Activity,
  },
];

const planItems = [
  { id: 0, time: '08:30', label: 'Старт дня', detail: '5 минут дыхания', icon: Wind, tone: 'lavender' },
  { id: 1, time: '10:00', label: 'Глубокая работа', detail: 'AI · урок 04', icon: Brain, tone: 'blue' },
  { id: 2, time: '18:30', label: 'Силовая тренировка', detail: '45 минут · верх тела', icon: Dumbbell, tone: 'orange' },
  { id: 3, time: '22:40', label: 'Отбой', detail: 'Цель: 7 ч 45 мин', icon: Moon, tone: 'slate' },
];

function App() {
  const [activeView, setActiveView] = useState('overview');
  const [completedTasks, setCompletedTasks] = useState([0]);
  const [showLog, setShowLog] = useState(false);
  const [toast, setToast] = useState('');
  const [selectedMood, setSelectedMood] = useState(null);

  const notify = (message) => {
    setToast(message);
    window.clearTimeout(window.__novaToast);
    window.__novaToast = window.setTimeout(() => setToast(''), 2800);
  };

  const toggleTask = (id) => {
    setCompletedTasks((current) =>
      current.includes(id) ? current.filter((taskId) => taskId !== id) : [...current, id],
    );
    notify(completedTasks.includes(id) ? 'Задача возвращена в план' : 'Отлично. Один шаг сделан');
  };

  const navigate = (view) => {
    setActiveView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="app-shell">
      <Sidebar activeView={activeView} onNavigate={navigate} onLog={() => setShowLog(true)} />
      <main className="main-content">
        <Topbar activeView={activeView} onLog={() => setShowLog(true)} onNotify={notify} />
        {activeView === 'overview' && (
          <Overview
            completedTasks={completedTasks}
            onToggleTask={toggleTask}
            onNavigate={navigate}
            onAction={notify}
          />
        )}
        {activeView === 'learning' && <Learning onAction={notify} />}
        {activeView === 'training' && <Training onAction={notify} />}
        {activeView === 'analytics' && <Analytics onAction={notify} />}
        {activeView === 'goals' && <Goals onAction={notify} />}
        {activeView === 'schedule' && <Schedule onAction={notify} />}
        {activeView === 'notes' && <Notes onAction={notify} />}
      </main>
      <MobileNav activeView={activeView} onNavigate={navigate} />
      {showLog && (
        <QuickLogModal
          mood={selectedMood}
          setMood={setSelectedMood}
          onClose={() => setShowLog(false)}
          onSave={() => {
            setShowLog(false);
            notify('Запись сохранена — Nova учтёт её в аналитике');
          }}
        />
      )}
      {toast && <div className="toast"><Check size={16} />{toast}</div>}
    </div>
  );
}

function Sidebar({ activeView, onNavigate, onLog }) {
  return (
    <aside className="sidebar">
      <div className="brand-wrap">
        <div className="brand-mark"><span></span><span></span><span></span></div>
        <div>
          <div className="brand-name">nova</div>
          <div className="brand-subtitle">your adaptive rhythm</div>
        </div>
      </div>

      <div className="side-label">Пространство</div>
      <nav className="side-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              className={`nav-item ${activeView === item.id ? 'active' : ''}`}
              key={item.id}
              onClick={() => onNavigate(item.id)}
            >
              <Icon size={18} strokeWidth={activeView === item.id ? 2.25 : 1.8} />
              <span>{item.label}</span>
              {item.badge && <span className="nav-badge">{item.badge}</span>}
            </button>
          );
        })}
      </nav>

      <div className="side-label second-label">Твоя система</div>
      <nav className="side-nav secondary-nav">
        {secondaryItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              className={`nav-item ${activeView === item.id ? 'active' : ''}`}
              key={item.id}
              onClick={() => onNavigate(item.id)}
            >
              <Icon size={18} strokeWidth={1.8} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="side-spacer" />
      <button className="sync-card" onClick={() => onNavigate('analytics')}>
        <div className="sync-icon"><Watch size={16} /></div>
        <div className="sync-copy">
          <strong>Health Connect</strong>
          <span><i></i> Синхронизировано</span>
        </div>
        <ChevronRight size={15} className="sync-arrow" />
      </button>
      <div className="sidebar-bottom">
        <button className="profile-card" onClick={() => onNavigate('goals')}>
          <div className="avatar avatar-small">АК</div>
          <div className="profile-copy"><strong>Алексей К.</strong><span>7 дней подряд <Flame size={11} fill="currentColor" /></span></div>
          <ChevronDown size={15} />
        </button>
        <button className="settings-button" aria-label="Настройки"><Settings size={18} /></button>
      </div>
    </aside>
  );
}

function MobileNav({ activeView, onNavigate }) {
  return (
    <nav className="mobile-nav">
      {navItems.map((item) => {
        const Icon = item.icon;
        return <button key={item.id} onClick={() => onNavigate(item.id)} className={activeView === item.id ? 'active' : ''}><Icon size={20} /><span>{item.label}</span></button>;
      })}
    </nav>
  );
}

function Topbar({ activeView, onLog, onNotify }) {
  const labels = { overview: 'Обзор', learning: 'Развитие', training: 'Тренировки', analytics: 'Аналитика', goals: 'Цели', schedule: 'Расписание', notes: 'Заметки' };
  return (
    <header className="topbar">
      <div className="topbar-context"><span className="context-dot"></span><span>Понедельник, 21 сентября 2026</span><ChevronRight size={13} /><strong>{labels[activeView]}</strong></div>
      <div className="topbar-actions">
        <button className="icon-button search-button" aria-label="Поиск" onClick={() => onNotify('Поиск скоро научится искать по всей твоей системе')}><Search size={18} /></button>
        <button className="icon-button notification-button" aria-label="Уведомления" onClick={() => onNotify('У тебя 2 новых инсайта от Nova')}><Bell size={18} /><i></i></button>
        <button className="quick-log-button" onClick={onLog}><Plus size={16} strokeWidth={2.5} /><span>Быстрый лог</span></button>
        <div className="avatar avatar-top">АК</div>
      </div>
    </header>
  );
}

function PageTitle({ eyebrow, title, description, action, icon: Icon }) {
  return (
    <div className="page-title-row">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action && <button className="outline-button" onClick={action.onClick}>{action.icon && <action.icon size={16} />}{action.label}</button>}
    </div>
  );
}

function Overview({ completedTasks, onToggleTask, onNavigate, onAction }) {
  return (
    <div className="page overview-page">
      <PageTitle
        eyebrow="Доброе утро, Алексей"
        title="Собери день под себя."
        description="Nova знает твой ритм и помогает держать главное в фокусе."
        action={{ label: 'Записать состояние', icon: Plus, onClick: () => onAction('Открой «Быстрый лог», чтобы добавить состояние') }}
      />

      <section className="hero-grid">
        <article className="readiness-hero">
          <div className="hero-glow"></div>
          <div className="hero-topline"><span className="hero-kicker"><Sparkles size={14} /> Персональный прогноз</span><button className="ghost-light-button" onClick={() => onNavigate('analytics')}><MoreHorizontal size={20} /></button></div>
          <div className="readiness-body">
            <div className="readiness-copy">
              <h2>Сегодня твой<br /><em>ритм</em> набирает ход.</h2>
              <p>Энергии достаточно для силовой тренировки и одной глубокой задачи. Не спеши — держи темп.</p>
              <button className="light-pill-button" onClick={() => onNavigate('training')}>Посмотреть рекомендацию <ArrowUpRight size={15} /></button>
            </div>
            <ReadinessRing />
          </div>
          <div className="hero-footer"><span><i className="status-pulse"></i> Обновлено 8 минут назад</span><span className="hero-weather"><CloudSun size={15} /> 18° · Москва</span></div>
        </article>
        <CoachCard onAction={onAction} />
      </section>

      <section className="metrics-grid">
        <MetricCard label="Готовность" value="84" unit="/ 100" delta="+8" detail="выше твоей нормы" icon={Gauge} tone="violet" trend="up" />
        <MetricCard label="Сон" value="7ч 48м" delta="+42 мин" detail="к средней неделе" icon={Moon} tone="blue" trend="up" />
        <MetricCard label="Нагрузка" value="62" unit="/ 100" delta="умеренная" detail="можно тренироваться" icon={Activity} tone="orange" trend="neutral" />
        <MetricCard label="Фокус" value="6.4" unit="ч" delta="+1.2 ч" detail="глубокой работы" icon={Brain} tone="green" trend="up" />
      </section>

      <section className="dashboard-content-grid">
        <FocusCard onNavigate={onNavigate} onAction={onAction} />
        <DayPlan completedTasks={completedTasks} onToggleTask={onToggleTask} />
      </section>

      <section className="bottom-dashboard-grid">
        <RecoveryCard onNavigate={onNavigate} />
        <ReflectionCard onAction={onAction} />
      </section>
    </div>
  );
}

function ReadinessRing() {
  const radius = 73;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - 0.84);
  return (
    <div className="readiness-ring-wrap">
      <svg className="readiness-ring" viewBox="0 0 180 180" aria-label="Готовность 84 из 100">
        <circle className="ring-track" cx="90" cy="90" r={radius} />
        <circle className="ring-value" cx="90" cy="90" r={radius} style={{ strokeDasharray: circumference, strokeDashoffset: offset }} />
      </svg>
      <div className="ring-center"><strong>84</strong><span>готовность</span></div>
      <div className="ring-spark one"></div><div className="ring-spark two"></div>
    </div>
  );
}

function CoachCard({ onAction }) {
  return (
    <article className="coach-card">
      <div className="coach-top"><div className="coach-label"><span className="coach-avatar"><Sparkles size={15} /></span><span>Nova Coach</span></div><span className="live-label"><i></i> live</span></div>
      <div className="coach-message"><span className="quote-mark">“</span><p>Ты хорошо восстановился. Сегодня можно сделать чуть больше, но оставь место для любопытства.</p></div>
      <div className="coach-bottom"><button className="text-button" onClick={() => onAction('Диалог с Nova Coach скоро будет доступен')}><MessageCircle size={15} /> Обсудить с Nova</button><div className="coach-dots"><i className="active"></i><i></i><i></i></div></div>
    </article>
  );
}

function MetricCard({ label, value, unit, delta, detail, icon: Icon, tone, trend }) {
  return (
    <article className="metric-card">
      <div className={`metric-icon ${tone}`}><Icon size={17} /></div>
      <div className="metric-heading"><span>{label}</span><ArrowUpRight size={15} /></div>
      <div className="metric-value">{value}<small>{unit}</small></div>
      <div className="metric-foot"><span className={`metric-delta ${trend}`}>{trend === 'up' ? <ArrowUpRight size={12} /> : <span className="dash">—</span>}{delta}</span><span>{detail}</span></div>
    </article>
  );
}

function FocusCard({ onNavigate, onAction }) {
  return (
    <article className="focus-card card-surface">
      <div className="section-heading"><div><span className="section-kicker"><span className="tiny-dot purple"></span> Точка роста</span><h3>Твой главный фокус</h3></div><button className="more-button" onClick={() => onNavigate('learning')}><ArrowUpRight size={17} /></button></div>
      <div className="focus-inner">
        <div className="course-visual indigo-visual"><div className="orb orb-one"></div><div className="orb orb-two"></div><div className="visual-grid"></div><span className="visual-number">04</span><div className="visual-label">AI<br />systems</div><div className="visual-play"><Play size={16} fill="currentColor" /></div></div>
        <div className="focus-copy"><div className="tag-row"><span className="soft-tag">AI & технологии</span><span className="duration"><Clock3 size={13} /> 18 мин</span></div><h4>Учимся видеть<br />систему целиком</h4><p>Урок 04 · От идеи к работающему прототипу</p><div className="progress-row"><div className="progress-track"><span style={{ width: '68%' }}></span></div><strong>68%</strong></div><button className="primary-button" onClick={() => onAction('Урок 04 открыт — удачной глубокой работы')}><Play size={15} fill="currentColor" /> Продолжить урок</button></div>
      </div>
      <div className="focus-footer"><span><Check size={13} /> 4 урока уже позади</span><button onClick={() => onAction('Все материалы курса будут здесь')} >Все материалы <ChevronRight size={14} /></button></div>
    </article>
  );
}

function DayPlan({ completedTasks, onToggleTask }) {
  return (
    <article className="day-plan card-surface">
      <div className="section-heading"><div><span className="section-kicker"><span className="tiny-dot orange"></span> Ритм дня</span><h3>План на сегодня</h3></div><button className="date-switcher"><span>21 сен</span><ChevronDown size={14} /></button></div>
      <div className="plan-list">
        {planItems.map((item) => {
          const Icon = item.icon;
          const isDone = completedTasks.includes(item.id);
          return <button className={`plan-item ${isDone ? 'done' : ''}`} key={item.id} onClick={() => onToggleTask(item.id)}><span className="plan-time">{item.time}</span><span className={`plan-icon ${item.tone}`}><Icon size={15} /></span><span className="plan-copy"><strong>{item.label}</strong><small>{item.detail}</small></span><span className={`check-circle ${isDone ? 'checked' : ''}`}>{isDone && <Check size={13} strokeWidth={3} />}</span></button>;
        })}
      </div>
      <button className="add-plan-button"><Plus size={15} /> Добавить в план</button>
    </article>
  );
}

function RecoveryCard({ onNavigate }) {
  const bars = [42, 57, 49, 72, 64, 86, 69];
  return (
    <article className="recovery-card card-surface"><div className="section-heading"><div><span className="section-kicker"><span className="tiny-dot green"></span> Восстановление</span><h3>Тело говорит</h3></div><button className="more-button" onClick={() => onNavigate('analytics')}><ArrowUpRight size={17} /></button></div><div className="recovery-main"><div className="recovery-score"><strong>82</strong><span>хорошо</span></div><div className="recovery-info"><p>Твой ресурс растёт третий день подряд.</p><div className="recovery-legend"><span><i className="legend-dot purple-dot"></i> HRV</span><span><i className="legend-dot blue-dot"></i> сон</span></div></div><div className="mini-bars">{bars.map((height, i) => <span key={i} style={{ height: `${height}%` }} className={i === 5 ? 'selected' : ''}></span>)}</div></div><div className="recovery-days"><span>Пн</span><span>Вт</span><span>Ср</span><span>Чт</span><span>Пт</span><span>Сб</span><span>Вс</span></div></article>
  );
}

function ReflectionCard({ onAction }) {
  return (
    <article className="reflection-card card-surface"><div className="reflection-icon"><MessageCircle size={18} /></div><div className="reflection-copy"><span className="section-kicker">Вечерняя рефлексия</span><h3>Как ты себя чувствуешь?</h3><p>30 секунд сейчас помогут Nova точнее настроить завтрашний день.</p></div><button className="round-arrow" onClick={() => onAction('Рефлексия добавлена в вечерний план')}><ArrowUpRight size={18} /></button><div className="reflection-line"></div></article>
  );
}

function Learning({ onAction }) {
  const [filter, setFilter] = useState('Для тебя');
  const filters = ['Для тебя', 'AI & технологии', 'Здоровье', 'Саморазвитие'];
  return <div className="page learning-page"><PageTitle eyebrow="Твоя библиотека" title="Развивайся в своём темпе." description="Короткие курсы, реальные задачи и повторение в нужный момент." action={{ label: 'Настроить интересы', icon: SlidersHorizontal, onClick: () => onAction('Настройки интересов скоро будут доступны') }} />
    <div className="learning-toolbar"><div className="filter-pills">{filters.map((item) => <button className={filter === item ? 'active' : ''} key={item} onClick={() => setFilter(item)}>{item}</button>)}</div><button className="sort-button"><TrendingUp size={15} /> Твой прогресс <ChevronDown size={14} /></button></div>
    <section className="learning-hero"><div className="learning-hero-copy"><span className="hero-kicker dark"><Sparkles size={14} /> Персональный маршрут · неделя 03</span><h2>Чем глубже понимаешь,<br /><em>тем смелее создаёшь.</em></h2><p>Nova собрала следующий шаг на основе твоих интересов и практики.</p><button className="light-pill-button" onClick={() => onAction('Практика открыта — 25 минут фокуса')}>Открыть практику <ArrowUpRight size={15} /></button></div><div className="learning-hero-art"><div className="learning-ring ring-a"></div><div className="learning-ring ring-b"></div><div className="learning-ring ring-c"></div><span>03</span><small>week</small></div><div className="learning-hero-meta"><span><strong>3</strong> темы</span><span><strong>2ч 40м</strong> в неделю</span><span><strong>86%</strong> совпадение</span></div></section>
    <div className="section-heading wide-heading"><div><span className="section-kicker"><span className="tiny-dot purple"></span> Подобрано для тебя</span><h3>{filter === 'Для тебя' ? 'Следующие шаги' : filter}</h3></div><span className="result-count">{filter === 'Для тебя' ? '3 курса' : '12 материалов'}</span></div>
    <section className="course-grid">{courseData.map((course) => <CourseCard key={course.id} course={course} onAction={onAction} />)}</section>
    <section className="practice-banner"><div className="practice-symbol"><Target size={23} /></div><div><span className="section-kicker">Практика дня</span><h3>Объясни AI-продукт за 3 минуты</h3><p>Задание подберётся под сегодняшний урок и проверит, что осталось с тобой.</p></div><button className="dark-action" onClick={() => onAction('Задание запущено — записывай первую мысль')}><Mic size={16} /> Начать</button></section>
  </div>;
}

function CourseCard({ course, onAction }) {
  const Icon = course.icon;
  return <article className="course-card"><div className={`course-thumb ${course.color}`}><div className="course-thumb-pattern"></div><Icon size={22} /><span className="course-card-num">0{course.id}</span><span className="course-card-play"><Play size={13} fill="currentColor" /></span></div><div className="course-card-content"><div className="course-card-top"><span>{course.tag}</span><MoreHorizontal size={17} /></div><h4>{course.title}</h4><p>{course.description}</p><div className="course-card-meta"><span><BookOpen size={13} /> {course.lessons}</span><span><Clock3 size={13} /> {course.duration}</span></div><div className="course-progress"><span><i style={{ width: `${course.progress}%` }}></i></span><strong>{course.progress ? `${course.progress}%` : 'Начать'}</strong></div><button className="course-cta" onClick={() => onAction(`${course.title}: материал открыт`)}>{course.progress ? 'Продолжить' : 'Добавить в маршрут'} <ChevronRight size={14} /></button></div></article>;
}

function Training({ onAction }) {
  const [selectedDay, setSelectedDay] = useState(2);
  const week = [{ day: 'Пн', date: '21', type: 'Сила', status: 'done' }, { day: 'Вт', date: '22', type: 'Zone 2', status: 'next' }, { day: 'Ср', date: '23', type: 'Отдых', status: 'rest' }, { day: 'Чт', date: '24', type: 'Сила', status: 'planned' }, { day: 'Пт', date: '25', type: 'Бег', status: 'planned' }, { day: 'Сб', date: '26', type: 'Мобилити', status: 'planned' }, { day: 'Вс', date: '27', type: 'Отдых', status: 'rest' }];
  return <div className="page training-page"><PageTitle eyebrow="Движение и восстановление" title="Тренируйся по сигналам тела." description="План тренера встречается с данными твоего дня — без догадок." action={{ label: 'Записать тренировку', icon: Plus, onClick: () => onAction('Форма записи тренировки скоро будет доступна') }} />
    <section className="training-top-grid"><article className="training-readiness card-surface"><div className="training-readiness-copy"><span className="section-kicker"><span className="tiny-dot green"></span> Готовность сегодня</span><h2>Можно дать<br /><em>телу нагрузку.</em></h2><p>HRV и сон выше твоей 30-дневной нормы. Силовая — хороший выбор.</p><button className="primary-button" onClick={() => onAction('Тренировка добавлена в план')}><Dumbbell size={15} /> Выбрать тренировку</button></div><div className="big-readiness-ring"><svg viewBox="0 0 170 170"><circle cx="85" cy="85" r="67" className="big-ring-track"/><circle cx="85" cy="85" r="67" className="big-ring-value"/></svg><div><strong>84</strong><span>из 100</span></div></div><div className="training-signal"><span><HeartPulse size={14} /> HRV</span><strong>68 ms</strong><small>+12%</small></div></article><article className="recommendation-card"><div className="recommendation-top"><span className="section-kicker"><Sparkles size={14} /> Nova рекомендует</span><span className="recommendation-time"><Clock3 size={13} /> 45 мин</span></div><div className="recommendation-icon"><Dumbbell size={24} /></div><h3>Верх тела · сила</h3><p>4 упражнения · умеренная интенсивность</p><div className="recommendation-stats"><span><Activity size={14} /> RPE 7</span><span><Flame size={14} /> 320 ккал</span><span><Timer size={14} /> 60 сек</span></div><button className="outline-dark-button" onClick={() => onAction('План тренировки открыт')}>Смотреть план <ArrowUpRight size={15} /></button></article></section>
    <section className="training-week-card card-surface"><div className="section-heading"><div><span className="section-kicker"><span className="tiny-dot orange"></span> Тренировочная неделя</span><h3>План и факт</h3></div><div className="week-controls"><button><ChevronLeft size={16} /></button><span>21–27 сентября</span><button><ChevronRight size={16} /></button></div></div><div className="week-days">{week.map((item, index) => <button className={`week-day ${selectedDay === index ? 'selected' : ''} ${item.status}`} onClick={() => setSelectedDay(index)} key={item.day}><span>{item.day}</span><strong>{item.date}</strong><i>{item.status === 'done' ? <Check size={12} /> : item.status === 'rest' ? '—' : item.status === 'next' ? <Zap size={12} fill="currentColor" /> : <span></span>}</i><small>{item.type}</small></button>)}</div><div className="week-insight"><div className="insight-mark"><TrendingUp size={16} /></div><p><strong>Хороший баланс.</strong> За неделю у тебя 2 силовых, 1 кардио и достаточно места для восстановления.</p><button onClick={() => onAction('Вся история тренировок загружена')}>История <ChevronRight size={14} /></button></div></section>
    <section className="training-bottom-grid"><article className="workout-log card-surface"><div className="section-heading"><div><span className="section-kicker"><span className="tiny-dot blue"></span> Последняя тренировка</span><h3>Пятничный бег</h3></div><span className="log-date">19 сен</span></div><div className="workout-log-stats"><div><strong>6.8</strong><span>км</span></div><div><strong>38:24</strong><span>время</span></div><div><strong>154</strong><span>ср. пульс</span></div><div><strong>5:38</strong><span>темп / км</span></div></div><div className="route-chart"><svg viewBox="0 0 600 96" preserveAspectRatio="none"><defs><linearGradient id="routeFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7565de" stopOpacity=".23"/><stop offset="100%" stopColor="#7565de" stopOpacity="0"/></linearGradient></defs><path d="M0 73 C30 67 40 55 65 62 S95 75 118 55 S148 33 175 47 S208 80 235 62 S266 45 286 49 S310 68 336 40 S362 26 390 42 S424 59 452 33 S478 25 506 35 S537 52 560 25 S585 19 600 18 L600 96 L0 96Z" fill="url(#routeFill)"/><path d="M0 73 C30 67 40 55 65 62 S95 75 118 55 S148 33 175 47 S208 80 235 62 S266 45 286 49 S310 68 336 40 S362 26 390 42 S424 59 452 33 S478 25 506 35 S537 52 560 25 S585 19 600 18" fill="none" stroke="#7565de" strokeWidth="3" strokeLinecap="round"/></svg></div><button className="text-button dark-text" onClick={() => onAction('Подробный анализ тренировки будет готов через секунду')}><BarChart3 size={15} /> Открыть разбор тренировки</button></article><article className="body-signals card-surface"><div className="section-heading"><div><span className="section-kicker"><span className="tiny-dot green"></span> Сигналы тела</span><h3>Сегодня</h3></div><span className="signal-status">стабильно</span></div><SignalRow icon={HeartPulse} label="Пульс покоя" value="52" unit="уд/мин" change="−4" positive /><SignalRow icon={Waves} label="ВСР" value="68" unit="мс" change="+12%" positive /><SignalRow icon={Moon} label="Восстановление сна" value="91" unit="%" change="+6%" positive /><SignalRow icon={Footprints} label="Шаги" value="4 820" unit="" change="42% цели" /></article></section>
  </div>;
}

function SignalRow({ icon: Icon, label, value, unit, change, positive }) {
  return <div className="signal-row"><span className="signal-icon"><Icon size={15} /></span><span className="signal-label">{label}</span><strong>{value}<small>{unit}</small></strong><span className={positive ? 'signal-change positive' : 'signal-change'}>{change}</span></div>;
}

function Analytics({ onAction }) {
  const [range, setRange] = useState('7 дней');
  const data = range === '7 дней' ? [38, 46, 42, 59, 54, 69, 82] : [31, 47, 39, 53, 49, 64, 58, 72, 68, 76, 81, 84];
  const chartPoints = data.map((value, index) => `${(index * 100) / (data.length - 1)},${98 - value}`).join(' ');
  return <div className="page analytics-page"><PageTitle eyebrow="Данные, которым можно доверять" title="Замечай свой паттерн." description="Nova собирает сигналы, а не оценивает тебя. Смотри на динамику и выбирай следующий шаг." action={{ label: 'Экспорт данных', icon: ArrowUpRight, onClick: () => onAction('Отчёт подготовлен для экспорта') }} />
    <section className="analytics-summary"><SummaryCard label="Средняя готовность" value="78" suffix="/ 100" change="+14%" icon={Gauge} tone="purple" /><SummaryCard label="Средний сон" value="7:32" suffix="ч" change="+28 мин" icon={Moon} tone="blue" /><SummaryCard label="Тренировок" value="12" suffix="за месяц" change="+3" icon={Dumbbell} tone="orange" /><SummaryCard label="Фокус" value="31.4" suffix="ч" change="+18%" icon={Brain} tone="green" /></section>
    <section className="analytics-chart-card card-surface"><div className="chart-card-header"><div><span className="section-kicker"><span className="tiny-dot purple"></span> Твоя динамика</span><h3>Готовность и нагрузка</h3></div><div className="range-switcher">{['7 дней', '30 дней'].map((item) => <button className={range === item ? 'active' : ''} key={item} onClick={() => setRange(item)}>{item}</button>)}</div></div><div className="chart-legend"><span><i className="chart-line purple-line"></i> готовность</span><span><i className="chart-line orange-line"></i> нагрузка</span><span className="chart-average">среднее за период <strong>78</strong></span></div><div className="big-chart"><div className="chart-y-labels"><span>100</span><span>75</span><span>50</span><span>25</span><span>0</span></div><div className="chart-plot"><div className="grid-lines"><i></i><i></i><i></i><i></i><i></i></div><svg viewBox="0 0 100 100" preserveAspectRatio="none"><defs><linearGradient id="chartArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7b6be4" stopOpacity=".2"/><stop offset="100%" stopColor="#7b6be4" stopOpacity="0"/></linearGradient></defs><polygon points={`0,98 ${chartPoints} 100,98`} fill="url(#chartArea)"/><polyline points={chartPoints} fill="none" stroke="#7b6be4" strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round"/><polyline points={data.map((value, index) => `${(index * 100) / (data.length - 1)},${108 - value * .58}`).join(' ')} fill="none" stroke="#e8a15e" strokeWidth="1.3" vectorEffect="non-scaling-stroke" strokeDasharray="2 2" strokeLinecap="round" /></svg><div className="chart-tooltip"><strong>82</strong><span>сегодня</span></div><div className="chart-labels">{(range === '7 дней' ? ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'] : ['1', '4', '7', '10', '13', '16', '19', '21']).map((label, i) => <span key={i}>{label}</span>)}</div></div></div></section>
    <section className="analytics-insights"><article className="insight-card insight-purple"><div className="insight-card-icon"><Sparkles size={18} /></div><span>Инсайт недели</span><h3>Сон на 40 минут дольше даёт тебе +9 пунктов готовности.</h3><button onClick={() => onAction('Привычка добавлена в твой план')}><Plus size={14} /> Добавить привычку</button></article><article className="insight-card insight-white"><div className="insight-card-top"><div className="insight-card-icon peach"><TrendingUp size={18} /></div><span>Лучший день</span><strong>Четверг</strong></div><div className="insight-compare"><div><small>Готовность</small><strong>91</strong></div><div className="compare-arrow"><ArrowUpRight size={16} /></div><div><small>Фокус</small><strong>5.8ч</strong></div></div><p>Ты рано лёг, сделал прогулку и не перегрузил календарь.</p></article><article className="insight-card insight-white"><div className="insight-card-top"><div className="insight-card-icon mint"><HeartPulse size={18} /></div><span>Что изменить</span></div><h3>После интенсивных дней добавляй 15 минут мобилити.</h3><div className="mini-progress"><span style={{ width: '74%' }}></span></div><small>74% восстановления на следующий день</small></article></section>
  </div>;
}

function SummaryCard({ label, value, suffix, change, icon: Icon, tone }) {
  return <article className="summary-card"><div className={`summary-icon ${tone}`}><Icon size={17} /></div><span>{label}</span><div className="summary-value">{value}<small>{suffix}</small></div><div className="summary-change"><ArrowUpRight size={12} /> {change}</div></article>;
}

function Goals({ onAction }) {
  return <div className="page simple-page"><PageTitle eyebrow="Система под тебя" title="Цели без лишнего шума." description="Nova помогает держать направление, а не жить в списке задач." action={{ label: 'Добавить цель', icon: Plus, onClick: () => onAction('Новая цель добавлена в черновики') }} /><section className="goals-overview"><article className="north-star-card"><div className="north-star-orbit"></div><span className="section-kicker"><Sparkles size={14} /> Твоя главная звезда</span><h2>Стать человеком,<br /><em>который создаёт.</em></h2><p>Фокус на 90 дней · 32% пути</p><div className="goal-progress"><span><i style={{ width: '32%' }}></i></span><strong>32%</strong></div></article><div className="goal-stack"><GoalRow icon={Brain} tone="purple" title="Создать AI-продукт" detail="До 20 декабря" value="42%" progress="42%" /><GoalRow icon={Dumbbell} tone="orange" title="Стабильная форма" detail="4 тренировки / неделю" value="3 из 4" progress="75%" /><GoalRow icon={Moon} tone="blue" title="Сон до 23:00" detail="7 дней подряд" value="5 дней" progress="71%" /></div></section><section className="values-card card-surface"><div><span className="section-kicker"><Heart size={14} /> Как с тобой работать</span><h3>Nova уже знает твой стиль</h3><p>Ты лучше двигаешься, когда видишь смысл, а не просто цифру. Поэтому в планах — короткие шаги, ясный контекст и место для выбора.</p></div><div className="trait-list"><span>Любопытный</span><span>Системный</span><span>Лучше утром</span><span>Ценишь свободу</span></div><button className="outline-button" onClick={() => onAction('Профиль адаптивности открыт')}>Изменить профиль <ChevronRight size={15} /></button></section></div>;
}

function GoalRow({ icon: Icon, tone, title, detail, value, progress }) {
  return <article className="goal-row card-surface"><span className={`goal-icon ${tone}`}><Icon size={17} /></span><div className="goal-copy"><strong>{title}</strong><small>{detail}</small><div className="goal-bar"><i style={{ width: progress }}></i></div></div><b>{value}</b><ChevronRight size={16} /> </article>;
}

function Schedule({ onAction }) {
  return <div className="page simple-page"><PageTitle eyebrow="Твой календарь" title="Время тоже можно настроить." description="Nova бережно встраивает важное в реальную жизнь — между работой, людьми и восстановлением." action={{ label: 'Подключить календарь', icon: Plus, onClick: () => onAction('Подключение календаря скоро будет доступно') }} /><section className="schedule-layout"><article className="calendar-card card-surface"><div className="calendar-header"><button><ChevronLeft size={17} /></button><h3>Сентябрь 2026</h3><button><ChevronRight size={17} /></button></div><div className="calendar-weekdays">{['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((day) => <span key={day}>{day}</span>)}</div><div className="calendar-grid">{['31', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '1', '2', '3', '4'].map((day, i) => <button key={`${day}-${i}`} className={`${i === 21 ? 'today' : ''} ${i < 1 || i > 30 ? 'muted' : ''}`}>{day}{[8, 21, 24].includes(i) && <i></i>}</button>)}</div></article><article className="day-agenda card-surface"><div className="section-heading"><div><span className="section-kicker"><span className="tiny-dot orange"></span> Сегодня · 21 сентября</span><h3>Твой ритм</h3></div><button className="more-button" onClick={() => onAction('Настройки расписания открыты')}><MoreHorizontal size={18} /></button></div><div className="agenda-list"><AgendaItem time="08:30" title="Старт дня" detail="Дыхание · 5 минут" tone="purple" done /><AgendaItem time="10:00" title="Глубокая работа" detail="AI · урок 04" tone="blue" active /><AgendaItem time="13:00" title="Обед и прогулка" detail="Свободное окно · 30 минут" tone="green" /><AgendaItem time="18:30" title="Силовая тренировка" detail="Верх тела · 45 минут" tone="orange" /></div><button className="add-plan-button"><Plus size={15} /> Добавить событие</button></article></section><section className="schedule-note"><div className="schedule-note-icon"><Sparkles size={18} /></div><div><strong>У тебя есть 2 окна для фокуса</strong><p>Nova нашла их во вторник и четверг. Хочешь запланировать практику?</p></div><button className="dark-action" onClick={() => onAction('Практика запланирована на вторник')}>Запланировать</button></section></div>;
}

function AgendaItem({ time, title, detail, tone, done, active }) {
  return <div className={`agenda-item ${done ? 'done' : ''} ${active ? 'active' : ''}`}><span className="agenda-time">{time}</span><span className={`agenda-dot ${tone}`}></span><div><strong>{title}</strong><small>{detail}</small></div>{done ? <Check size={15} className="agenda-check" /> : active ? <span className="now-pill">сейчас</span> : null}</div>;
}

function Notes({ onAction }) {
  const [note, setNote] = useState('');
  return <div className="page simple-page notes-page"><PageTitle eyebrow="Твои наблюдения" title="Замечай больше." description="Запиши мысль, ощущение или контекст — Nova найдёт связь в данных." action={{ label: 'Новая заметка', icon: Plus, onClick: () => document.querySelector('.note-input')?.focus() }} /><section className="notes-layout"><article className="new-note-card"><div className="note-top"><span className="note-symbol"><Sparkles size={16} /></span><span>Новая заметка</span><span className="note-date">21 сентября · 09:14</span></div><textarea className="note-input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Что происходит? Как ты себя чувствуешь?" /><div className="note-footer"><div className="note-tags"><button><Brain size={13} /> Мысль</button><button><HeartPulse size={13} /> Самочувствие</button><button><Dumbbell size={13} /> Тренировка</button></div><button className="send-note" onClick={() => { setNote(''); onAction('Заметка сохранена и добавлена в контекст Nova'); }}><Send size={15} /> Сохранить</button></div></article><article className="notes-history card-surface"><div className="section-heading"><div><span className="section-kicker"><span className="tiny-dot blue"></span> Недавнее</span><h3>Твои записи</h3></div><button className="more-button"><Search size={17} /></button></div><div className="note-history-list"><HistoryNote date="Сегодня, 08:42" text="Сон был глубоким, проснулся до будильника." tag="Самочувствие" tone="blue" /><HistoryNote date="Вчера, 19:24" text="После тренировки энергии больше, чем ожидал." tag="Тренировка" tone="orange" /><HistoryNote date="19 сентября, 11:08" text="Интересно, как объяснить сложную идею простыми словами." tag="Мысль" tone="purple" /></div><button className="view-all-button" onClick={() => onAction('Показаны все заметки')}>Все записи <ChevronRight size={14} /></button></article></section><section className="notes-insight"><div className="insight-card-icon"><Sparkles size={18} /></div><div><span>Nova заметила связь</span><h3>Когда ты записываешь мысли утром, вечером легче начать практику.</h3></div><button onClick={() => onAction('Связь добавлена в аналитику')}>Подробнее <ArrowUpRight size={15} /></button></section></div>;
}

function HistoryNote({ date, text, tag, tone }) {
  return <div className="history-note"><div className={`history-dot ${tone}`}></div><div className="history-copy"><span>{date} · <b>{tag}</b></span><p>{text}</p></div><ChevronRight size={15} /></div>;
}

function QuickLogModal({ mood, setMood, onClose, onSave }) {
  const moods = [{ icon: '☀', label: 'Отлично' }, { icon: '◒', label: 'Нормально' }, { icon: '⌁', label: 'Устал' }, { icon: '·', label: 'Не знаю' }];
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className="quick-modal"><div className="modal-header"><div><span className="eyebrow">Быстрый лог · 21 сентября</span><h2>Как ты сейчас?</h2></div><button className="modal-close" onClick={onClose}><X size={18} /></button></div><p className="modal-description">Пара слов поможет Nova лучше понять твой сегодняшний ритм.</p><div className="mood-options">{moods.map((item, index) => <button key={item.label} className={mood === index ? 'selected' : ''} onClick={() => setMood(index)}><strong>{item.icon}</strong><span>{item.label}</span></button>)}</div><label className="modal-label">Что важно зафиксировать?</label><textarea placeholder="Например: хорошо выспался, но много встреч..." /><div className="modal-actions"><button className="cancel-button" onClick={onClose}>Отмена</button><button className="save-button" onClick={onSave}><Check size={16} /> Сохранить лог</button></div></div></div>;
}

createRoot(document.getElementById('root')).render(<App />);
