'use client';
import { useEffect, useRef, useState } from 'react';
import {
  ArrowUpRight,
  ArrowRight,
  Keyboard,
  RotateCcw,
  Zap,
  Crosshair,
  Clock3,
  Command,
  Trophy,
  Activity,
  Swords,
  ChevronRight,
  Volume2,
  VolumeX,
  CircleHelp,
  X,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  NativeSelect,
  NativeSelectOption,
  NativeSelectOptGroup,
} from '@/components/ui/native-select';
import { passages, nextPassageIndex, stats } from '@/lib/typing.mjs';

type Language = keyof typeof passages;
type RecordItem = {
  date: string;
  wpm: number;
  accuracy: number;
  cpm: number;
  language: string;
  duration: number;
  title?: string;
};
type Racer = {
  id: string;
  name: string;
  progress: number;
  wpm: number;
  accuracy: number;
};
type Race = {
  type: string;
  id?: string;
  text?: string;
  remaining?: number;
  countdown?: number;
  players?: Racer[];
  winner?: string | null;
  message?: string;
};
const languageNames: Record<Language, string> = {
  english: '英文',
  chinese: '中文',
  code: '代码',
};
export default function Home() {
  const [tab, setTab] = useState('practice');
  const [language, setLanguage] = useState<Language>('chinese');
  const [passageIndex, setPassageIndex] = useState(1);
  const [duration, setDuration] = useState(30);
  const [typed, setTyped] = useState('');
  const [draft, setDraft] = useState('');
  const composing = useRef(false);
  const [attempts, setAttempts] = useState(0);
  const [errors, setErrors] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [phase, setPhase] = useState<'ready' | 'running' | 'done'>('ready');
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [notice, setNotice] = useState('');
  const [focused, setFocused] = useState(false);
  const [sound, setSound] = useState(false);
  const [help, setHelp] = useState(false);
  const [name, setName] = useState('');
  const [race, setRace] = useState<Race>({ type: 'idle' });
  const input = useRef<HTMLTextAreaElement>(null);
  const current = useRef<HTMLSpanElement>(null);
  const start = useRef(0);
  const socket = useRef<WebSocket | null>(null);
  const saved = useRef(false);
  const audio = useRef<AudioContext | null>(null);
  const racing = tab === 'race';
  const selectedPassage = passages[language][passageIndex];
  const categories = [...new Set(passages[language].map((p) => p.category))];
  const target = racing ? (race.text ?? '') : selectedPassage.text;
  const result = stats(target, typed, elapsed, attempts, errors);
  const remaining = racing
    ? (race.remaining ?? 60)
    : Math.max(0, duration - elapsed);
  const mine = race.players?.find((p) => p.id === race.id);
  const opponent = race.players?.find((p) => p.id !== race.id);

  const snapshot = useRef({});
  snapshot.current = {
    mode: tab,
    phase,
    wpm: racing ? (mine?.wpm ?? 0) : result.wpm,
    accuracy: racing ? (mine?.accuracy ?? 100) : result.accuracy,
    remaining,
  };
  useEffect(() => {
    const context = (
      document as Document & {
        modelContext?: {
          registerTool: (
            tool: {
              name: string;
              description: string;
              inputSchema: object;
              annotations: object;
              execute: (input: unknown) => unknown;
            },
            options: { signal: AbortSignal },
          ) => void | Promise<void>;
        };
      }
    ).modelContext;
    if (!context) return; // Optional browser capability; practice does not depend on it.
    const lifecycle = new AbortController();
    const report = (error: unknown) => {
      console.error('Practice tool registration failed', error);
      setNotice('浏览器练习状态工具注册失败，页面练习仍可直接使用。');
    };
    try {
      void Promise.resolve(
        context.registerTool(
          {
            name: 'read_typing_progress',
            description:
              'Read the current visible typing session metrics without modifying the session.',
            inputSchema: {
              type: 'object',
              properties: {},
              additionalProperties: false,
            },
            annotations: { readOnlyHint: true },
            execute(value) {
              if (
                !value ||
                typeof value !== 'object' ||
                Array.isArray(value) ||
                Object.keys(value).length
              )
                throw new Error('Expected an empty object');
              return snapshot.current;
            },
          },
          { signal: lifecycle.signal },
        ),
      ).catch(report);
    } catch (error) {
      report(error);
    }
    return () => lifecycle.abort();
  }, []);
  useEffect(() => {
    try {
      const raw = localStorage.getItem('typeflow.history');
      if (raw) {
        const value = JSON.parse(raw);
        if (
          !Array.isArray(value) ||
          value.some(
            (r) =>
              !r ||
              !Number.isFinite(r.wpm) ||
              !Number.isFinite(r.accuracy) ||
              !Number.isFinite(r.cpm) ||
              typeof r.language !== 'string' ||
              !Number.isFinite(r.duration) ||
              typeof r.date !== 'string' ||
              (r.title !== undefined && typeof r.title !== 'string'),
          )
        )
          throw new Error('练习记录格式无效');
        setRecords(value.slice(0, 50));
      }
    } catch (error) {
      console.error('History load failed', error);
      setNotice('无法读取本机练习记录，请检查浏览器存储权限。');
    }
    return () => {
      socket.current?.close();
      void audio.current?.close();
    };
  }, []);
  useEffect(() => {
    if (phase !== 'running' || racing) return;
    const timer = setInterval(() => {
      const next = Math.min(
        duration,
        (performance.now() - start.current) / 1000,
      );
      setElapsed(next);
      if (next >= duration) setPhase('done');
    }, 100);
    return () => clearInterval(timer);
  }, [phase, duration, racing]);
  useEffect(() => {
    if (phase !== 'done' || racing || saved.current) return;
    saved.current = true;
    const next = [
      {
        date: new Date().toISOString(),
        wpm: result.wpm,
        cpm: result.cpm,
        accuracy: result.accuracy,
        language: languageNames[language],
        duration: Math.max(1, Math.round(elapsed)),
        title: selectedPassage.title,
      },
      ...records,
    ].slice(0, 50);
    setRecords(next);
    try {
      localStorage.setItem('typeflow.history', JSON.stringify(next));
    } catch (error) {
      console.error('History save failed', error);
      setNotice('本次成绩未能保存到浏览器，请检查存储权限。');
    }
  }, [
    phase,
    racing,
    result.wpm,
    result.cpm,
    result.accuracy,
    records,
    language,
    duration,
    elapsed,
    selectedPassage.title,
  ]);
  useEffect(() => {
    current.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [typed]);
  function reset() {
    setTyped('');
    setDraft('');
    composing.current = false;
    setAttempts(0);
    setErrors(0);
    setElapsed(0);
    setPhase('ready');
    saved.current = false;
  }
  function leaveRace() {
    const ws = socket.current;
    socket.current = null;
    ws?.close();
    setRace({ type: 'idle' });
    reset();
  }
  function tick() {
    if (!sound) return;
    try {
      audio.current ??= new AudioContext();
      const ctx = audio.current;
      if (ctx.state === 'suspended')
        void ctx.resume().catch((e) => {
          console.error(e);
          setNotice('无法启用按键声音。');
        });
      const osc = ctx.createOscillator(),
        gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 640;
      gain.gain.setValueAtTime(0.025, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.035);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } catch (error) {
      console.error('Audio failed', error);
      setNotice('无法播放按键声音。');
      setSound(false);
    }
  }
  function change(value: string) {
    if (phase === 'done' || (racing && race.type !== 'running')) return;
    const now = performance.now();
    if (
      !racing &&
      phase === 'running' &&
      (now - start.current) / 1000 >= duration
    ) {
      setElapsed(duration);
      setPhase('done');
      return;
    }
    if (
      value.length > target.length ||
      !value.startsWith(typed.slice(0, Math.min(typed.length, value.length)))
    )
      return;
    if (value.length > typed.length) {
      const added = value.slice(typed.length);
      setAttempts((a) => a + added.length);
      setErrors(
        (e) =>
          e +
          [...added].filter((c, i) => c !== target[typed.length + i]).length,
      );
      tick();
    }
    if (phase === 'ready') {
      start.current = now;
      setPhase('running');
    }
    setTyped(value);
    if (racing) {
      if (socket.current?.readyState !== WebSocket.OPEN) {
        setNotice('连接已断开，本次比赛中止。');
        setRace({ type: 'error' });
        return;
      }
      socket.current.send(JSON.stringify({ type: 'input', text: value }));
    } else if (value.length === target.length) {
      setElapsed((now - start.current) / 1000);
      setPhase('done');
    }
  }
  function match() {
    leaveRace();
    setNotice('');
    setRace({ type: 'connecting' });
    const ws = new WebSocket(
      `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/ws`,
    );
    socket.current = ws;
    ws.onopen = () =>
      ws.send(
        JSON.stringify({ type: 'join', name: name.trim() || '键盘旅人' }),
      );
    ws.onmessage = (event) => {
      if (socket.current !== ws) return;
      try {
        const data: Race = JSON.parse(event.data);
        setRace((previous) => ({ ...previous, ...data }));
        if (data.type === 'running') {
          setPhase('running');
          setElapsed(60 - (data.remaining ?? 60));
        }
        if (data.type === 'done') setPhase('done');
        if (data.type === 'error' || data.type === 'cancelled') {
          setNotice(data.message ?? '比赛已中止');
          setPhase('ready');
        }
      } catch (error) {
        console.error('Race message failed', error);
        setNotice('收到无效比赛数据，连接已关闭。');
        setRace({ type: 'error' });
        socket.current = null;
        ws.close();
      }
    };
    ws.onerror = () => {
      if (socket.current !== ws) return;
      setNotice('无法连接竞赛服务，请稍后手动重试。');
      setRace({ type: 'error' });
    };
    ws.onclose = () => {
      if (socket.current === ws) {
        socket.current = null;
        setRace((previous) =>
          previous.type === 'done' ||
          previous.type === 'cancelled' ||
          previous.type === 'error'
            ? previous
            : { type: 'error', message: '连接已断开' },
        );
      }
    };
  }
  const activeRace = ['connecting', 'waiting', 'countdown', 'running'].includes(
    race.type,
  );
  return (
    <div className="app-shell">
      <header className="header">
        <a href="/" className="brand" aria-label="Typeflow 首页">
          <span className="brand-mark">
            <Keyboard size={23} />
          </span>
          typeflow<span className="brand-dot">.</span>
        </a>
        <div className="header-right">
          <span className="status-dot" /> 为专注而生{' '}
          <span className="header-line" />
          <button
            className="icon-button"
            onClick={() => setHelp(!help)}
            aria-label="练习说明"
          >
            <CircleHelp size={19} />
          </button>
          <span className="avatar">T</span>
        </div>
      </header>
      <main>
        <Tabs
          value={tab}
          onValueChange={(value) => {
            if (racing) leaveRace();
            else reset();
            setTab(String(value));
          }}
        >
          <div className="topline">
            <TabsList className="main-tabs" variant="line">
              <TabsTrigger value="practice">
                <Keyboard /> 自由练习
              </TabsTrigger>
              <TabsTrigger value="race">
                <Swords /> 实时竞速 <span className="beta">LIVE</span>
              </TabsTrigger>
              <TabsTrigger value="history">
                <Activity /> 我的进步
              </TabsTrigger>
            </TabsList>
            <span className="edition">MAKE EVERY KEYSTROKE COUNT</span>
          </div>
          {notice && (
            <div className="notice" role="alert">
              {notice}
              <button aria-label="关闭提示" onClick={() => setNotice('')}>
                <X size={16} />
              </button>
            </div>
          )}
          {help && (
            <div className="help">
              <strong>找到节奏，从准确开始</strong>
              <p>
                直接输入开始计时，退格可修正，错误输入仍计入正确率。WPM 按每 5
                个正确字符折算一词；中文同时显示每分钟字数。比赛为 60
                秒英文竞速，以服务端成绩为准，断线即中止。记录仅保存在当前浏览器。
              </p>
              <button onClick={() => setHelp(false)}>
                知道了 <ArrowRight size={15} />
              </button>
            </div>
          )}
          <TabsContent value="practice">
            <div className="intro">
              <div className="eyebrow">
                <span /> YOUR DAILY FLOW
              </div>
              <h1>
                让专注，<span>发生在指尖。</span>
              </h1>
              <p>放松肩膀，深呼吸。剩下的，交给你的节奏。</p>
            </div>
          </TabsContent>
          <TabsContent value="race">
            <div className="intro">
              <div className="eyebrow">
                <span /> FIND YOUR RIVAL
              </div>
              <h1>
                同一段文字，<span>两种心跳。</span>
              </h1>
              <p>与另一位真实玩家，在 60 秒里一起突破。</p>
            </div>
            <div className="match-panel">
              <div>
                <Swords size={23} />
                <strong>双人在线竞速</strong>
                <span>英文 · 60 秒 · 实时成绩</span>
              </div>
              <div>
                <input
                  aria-label="比赛昵称"
                  placeholder="你的昵称"
                  maxLength={20}
                  value={name}
                  disabled={activeRace}
                  onChange={(e) => setName(e.target.value)}
                />
                <button
                  className="primary"
                  onClick={activeRace ? leaveRace : match}
                >
                  {activeRace ? '取消比赛' : '开始匹配'}
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
            <div className="race-status" role="status">
              {
                (
                  {
                    idle: '准备好了吗？寻找与你同频的对手。',
                    connecting: '正在连接竞赛服务…',
                    waiting: '正在等待另一位玩家，可邀请朋友打开此页面加入。',
                    countdown: `对手已就绪，${race.countdown ?? 3} 秒后开始`,
                    running: '比赛进行中，保持你的节奏。',
                    done:
                      race.winner === null
                        ? '势均力敌，这次是平局。'
                        : race.winner === race.id
                          ? '恭喜，你赢得了这场比赛！'
                          : '比赛结束，每一次练习都在进步。',
                    error: race.message ?? '连接失败，请重新匹配。',
                    cancelled: race.message ?? '对手离开，比赛已中止。',
                  } as Record<string, string>
                )[race.type]
              }
            </div>
            {race.players && (
              <div className="racers">
                {race.players.map((p) => (
                  <div key={p.id}>
                    <span>
                      {p.id === race.id ? '你' : p.name}
                      <b>{p.wpm} WPM</b>
                    </span>
                    <progress max={100} value={p.progress} />
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
          {tab !== 'history' && (
            <>
              <section className="practice-card" aria-label="打字练习">
                <div className="settings">
                  <div className="setting-group">
                    <Clock3 size={16} />
                    {[15, 30, 60, 120].map((n) => (
                      <button
                        key={n}
                        disabled={racing || phase === 'running'}
                        className={duration === n && !racing ? 'selected' : ''}
                        onClick={() => {
                          setDuration(n);
                          reset();
                        }}
                      >
                        {n}
                        <span>s</span>
                      </button>
                    ))}
                  </div>
                  <span className="divider" />
                  <div className="setting-group language">
                    {(['english', 'chinese', 'code'] as Language[]).map((l) => (
                      <button
                        key={l}
                        disabled={racing || phase === 'running'}
                        className={
                          (racing ? l === 'english' : language === l)
                            ? 'selected'
                            : ''
                        }
                        onClick={() => {
                          setLanguage(l);
                          setPassageIndex(0);
                          reset();
                        }}
                      >
                        {languageNames[l]}
                      </button>
                    ))}
                  </div>
                  <span className="settings-spacer" />
                  <button
                    className={'icon-button ' + (sound ? 'lit' : '')}
                    aria-label={sound ? '关闭按键音' : '开启按键音'}
                    onClick={() => setSound(!sound)}
                  >
                    {sound ? <Volume2 size={18} /> : <VolumeX size={18} />}
                  </button>
                </div>
                {!racing && (
                  <div className="article-bar">
                    <div className="article-choice">
                      <label htmlFor="passage-select">
                        文章库 <span>{passages[language].length} 篇</span>
                      </label>
                      <NativeSelect
                        id="passage-select"
                        className="article-select"
                        value={passageIndex}
                        disabled={phase === 'running'}
                        onChange={(e) => {
                          setPassageIndex(Number(e.target.value));
                          reset();
                        }}
                      >
                        {categories.map((category) => (
                          <NativeSelectOptGroup key={category} label={category}>
                            {passages[language].map(
                              (p, i) =>
                                p.category === category && (
                                  <NativeSelectOption key={p.id} value={i}>
                                    {p.title}
                                  </NativeSelectOption>
                                ),
                            )}
                          </NativeSelectOptGroup>
                        ))}
                      </NativeSelect>
                      <button
                        className="shuffle-passage"
                        disabled={phase === 'running'}
                        onClick={() => {
                          setPassageIndex(
                            nextPassageIndex(
                              passages[language].length,
                              passageIndex,
                            ),
                          );
                          reset();
                        }}
                      >
                        <RotateCcw size={14} /> 换一篇
                      </button>
                    </div>
                    <p>
                      {selectedPassage.source} · {selectedPassage.text.length}{' '}
                      字符<span>输完全文或时间结束后结算</span>
                    </p>
                  </div>
                )}
                <div className="metrics">
                  <div className="metric">
                    <span>
                      <Zap size={15} /> 每分钟速度
                    </span>
                    <strong>
                      {racing ? (mine?.wpm ?? 0) : result.wpm}
                      <small>WPM</small>
                    </strong>
                  </div>
                  <div className="metric">
                    <span>
                      <Crosshair size={15} /> 正确率
                    </span>
                    <strong>
                      {racing ? (mine?.accuracy ?? 100) : result.accuracy}
                      <small>%</small>
                    </strong>
                  </div>
                  <div className="metric">
                    <span>
                      <Clock3 size={15} /> 剩余时间
                    </span>
                    <strong className="time">
                      {Math.ceil(remaining)}
                      <small>秒</small>
                    </strong>
                  </div>
                  <div className="mini-stat">
                    <span className="pulse-dot" />
                    {phase === 'done'
                      ? '练习完成'
                      : phase === 'running'
                        ? '专注进行中'
                        : '等待你的第一下按键'}
                    <small>
                      {language === 'chinese' && !racing
                        ? `${result.cpm} 字 / 分钟`
                        : '一键一刻，自有节奏'}
                    </small>
                  </div>
                </div>
                <div className={'typing-area ' + (focused ? 'focused' : '')}>
                  <span id="accessible-passage" className="sr-only">
                    练习文字：{target}
                  </span>
                  <div className="passage" aria-hidden="true">
                    {target.split('').map((c, i) => (
                      <span
                        key={i}
                        ref={i === typed.length ? current : undefined}
                        className={
                          (i < typed.length
                            ? typed[i] === c
                              ? 'correct'
                              : 'incorrect'
                            : '') + (i === typed.length ? ' caret' : '')
                        }
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                  <textarea
                    ref={input}
                    aria-label="输入上方练习文字"
                    aria-describedby="typing-hint accessible-passage"
                    className="typing-input"
                    value={composing.current ? draft : typed}
                    onCompositionStart={() => {
                      composing.current = true;
                      setDraft(typed);
                      if (!racing && phase === 'ready') {
                        start.current = performance.now();
                        setPhase('running');
                      }
                    }}
                    onCompositionEnd={(e) => {
                      composing.current = false;
                      change(e.currentTarget.value);
                    }}
                    onChange={(e) => {
                      if (composing.current) setDraft(e.target.value);
                      else change(e.target.value);
                    }}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck={false}
                    disabled={
                      phase === 'done' || (racing && race.type !== 'running')
                    }
                    onPaste={(e) => e.preventDefault()}
                    onDrop={(e) => e.preventDefault()}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape' && !racing) {
                        reset();
                        e.currentTarget.blur();
                      }
                    }}
                  />
                  {phase === 'done' && (
                    <div className="result-overlay">
                      <span className="result-icon">
                        <Trophy size={26} />
                      </span>
                      <strong>
                        {racing ? '本场比赛已完成' : '漂亮，又进步了一点。'}
                      </strong>
                      <p>
                        {racing
                          ? `${mine?.wpm ?? 0} WPM · 对手 ${opponent?.wpm ?? 0} WPM`
                          : `${result.wpm} WPM · ${result.accuracy}% 正确率`}
                      </p>
                      <button
                        className="primary"
                        onClick={() => {
                          if (racing) match();
                          else {
                            reset();
                            setTimeout(() => input.current?.focus(), 0);
                          }
                        }}
                      >
                        再来一次 <RotateCcw size={16} />
                      </button>
                    </div>
                  )}
                </div>
                <div className="typing-bottom">
                  <span id="typing-hint">
                    <span className="small-dot" />
                    {racing && !race.text
                      ? '匹配成功后，双方将收到同一篇文章'
                      : focused
                        ? '保持专注，你做得很好'
                        : '点击文字区域，开始输入'}
                  </span>
                  <button
                    className="restart"
                    disabled={racing}
                    onClick={() => {
                      reset();
                      input.current?.focus();
                    }}
                  >
                    <RotateCcw size={15} /> 重新开始 <kbd>esc</kbd>
                  </button>
                </div>
                <div className="time-track">
                  <div
                    style={{
                      width: `${phase === 'ready' ? 0 : (1 - remaining / (racing ? 60 : duration)) * 100}%`,
                    }}
                  />
                </div>
              </section>
              <div className="under-card">
                <span>
                  <kbd>esc</kbd> 重置练习
                </span>
                <span>
                  <Command size={13} /> 专注每一次敲击，而不只是速度
                </span>
              </div>
            </>
          )}
          <TabsContent value="history">
            <div className="intro">
              <div className="eyebrow">
                <span /> YOUR PERSONAL BEST
              </div>
              <h1>
                每一次练习，<span>都有回响。</span>
              </h1>
              <p>你的进步轨迹，仅保存在此浏览器中。</p>
            </div>
            <div className="history-table">
              {records.length ? (
                <table>
                  <thead>
                    <tr>
                      <th>练习时间</th>
                      <th>内容</th>
                      <th>时长</th>
                      <th>速度</th>
                      <th>正确率</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((r, i) => (
                      <tr key={i}>
                        <td>{new Date(r.date).toLocaleString('zh-CN')}</td>
                        <td>
                          {r.language}
                          {r.title && (
                            <small className="history-title">{r.title}</small>
                          )}
                        </td>
                        <td>{r.duration}s</td>
                        <td>
                          {r.wpm} WPM
                          {r.language === '中文' ? ` / ${r.cpm} 字每分` : ''}
                        </td>
                        <td>{r.accuracy}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="empty">
                  <Activity size={35} />
                  <h2>第一条记录，等你写下。</h2>
                  <p>完成一场自由练习，就能在这里看到成绩。</p>
                  <button
                    className="primary"
                    onClick={() => setTab('practice')}
                  >
                    去练习 <ArrowRight size={16} />
                  </button>
                </div>
              )}
            </div>
          </TabsContent>
          <div className="bottom-grid">
            <section className="personal">
              <div className="section-label">
                <Trophy size={16} /> 我的练习概览 <span>本机记录</span>
              </div>
              <div className="personal-values">
                <div>
                  <strong>
                    {records.length
                      ? Math.max(...records.map((r) => r.wpm))
                      : '—'}
                    <small>WPM</small>
                  </strong>
                  <span>最佳速度</span>
                </div>
                <div>
                  <strong>
                    {records.length
                      ? Math.round(
                          records.reduce((a, r) => a + r.accuracy, 0) /
                            records.length,
                        )
                      : '—'}
                    <small>%</small>
                  </strong>
                  <span>平均正确率</span>
                </div>
                <div>
                  <strong>
                    {records.length}
                    <small>次</small>
                  </strong>
                  <span>完成练习</span>
                </div>
              </div>
            </section>
            <button
              className="race-teaser"
              onClick={() => {
                if (racing) leaveRace();
                else reset();
                setTab(racing ? 'practice' : 'race');
              }}
            >
              <div>
                <span className="teaser-label">
                  {racing ? 'TAKE A BREATH' : 'BETTER TOGETHER'}
                  <ArrowUpRight size={20} />
                </span>
                <h2>
                  {racing ? '回到自己的节奏' : '一个人练习，两个人突破。'}
                </h2>
                <p>
                  {racing
                    ? '享受一场不被打扰的自由练习'
                    : '寻找对手，来一场 60 秒的指尖竞速'}{' '}
                  <ChevronRight size={16} />
                </p>
              </div>
              <div className="keycaps" aria-hidden="true">
                <span>⌘</span>
                <span>↗</span>
              </div>
            </button>
          </div>
        </Tabs>
      </main>
      <footer>
        <span className="footer-brand">typeflow.</span>
        <span>少一点分心，多一点心流。</span>
        <span>
          BUILT FOR YOUR FLOW <span className="footer-star">✳</span>
        </span>
      </footer>
    </div>
  );
}
