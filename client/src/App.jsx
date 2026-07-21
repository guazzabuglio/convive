import { useState, useRef, useEffect, useCallback } from "react";
import { useSocket } from "./useSocket.js";
import {
  testConnection, fetchRecipes, fetchRecipeDetail,
  recipeImageUrl, mealieRecipeUrl,
} from "./mealie.js";

const CARDS_PER_SESSION = 12;

// ─── SHARED UI ────────────────────────────────────────────────────────────────

function GFont() {
  return <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300&display=swap" rel="stylesheet" />;
}

const C = {
  bg: "#0e0e0e",
  surface: "#141414",
  border: "#222",
  gold: "#c8af78",
  goldFaint: "rgba(200,175,120,0.12)",
  goldBorder: "rgba(200,175,120,0.25)",
  muted: "#555",
  dim: "#333",
  text: "#e8e8e8",
  green: "#7ec898",
  red: "#c87e7e",
};

function Label({ children, style }) {
  return (
    <div style={{ color: C.muted, fontSize: 10, letterSpacing: 2.5, textTransform: "uppercase", marginBottom: 8, fontFamily: "Georgia, serif", ...style }}>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = "text", maxLength, extraStyle = {} }) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      value={value} onChange={onChange} placeholder={placeholder}
      type={type} maxLength={maxLength}
      style={{
        width: "100%", boxSizing: "border-box",
        background: C.surface, border: `1px solid ${focused ? C.gold : C.border}`,
        borderRadius: 10, padding: "13px 16px", color: C.text,
        fontSize: 15, outline: "none", fontFamily: "Georgia, serif",
        transition: "border-color 0.2s",
        ...extraStyle,
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  );
}

function PrimaryButton({ children, onClick, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: "100%", padding: "15px",
      background: disabled ? C.dim : C.gold,
      border: "none", borderRadius: 12,
      color: disabled ? C.muted : C.bg,
      fontSize: 16, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer",
      fontFamily: "'Cormorant Garamond', serif", letterSpacing: 1,
      transition: "all 0.2s",
    }}>
      {children}
    </button>
  );
}

function GhostButton({ children, onClick, style }) {
  return (
    <button onClick={onClick} style={{
      background: "none", border: `1px solid ${C.border}`,
      borderRadius: 12, padding: "13px", color: C.muted,
      cursor: "pointer", fontSize: 13, fontFamily: "Georgia, serif",
      width: "100%", letterSpacing: 0.5, transition: "border-color 0.2s",
      ...style,
    }}
      onMouseEnter={e => e.currentTarget.style.borderColor = C.gold}
      onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
    >
      {children}
    </button>
  );
}

function WordMark({ size = 48 }) {
  return (
    <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: size, fontWeight: 300, color: C.text, letterSpacing: size * 0.18, lineHeight: 1 }}>
      convive
    </div>
  );
}

function ErrorBox({ message }) {
  if (!message) return null;
  return (
    <div style={{ background: "rgba(200,100,100,0.12)", border: "1px solid rgba(200,100,100,0.3)", borderRadius: 10, padding: "12px 16px", color: "#e8a0a0", fontSize: 13, lineHeight: 1.5 }}>
      {message}
    </div>
  );
}

function Dot({ filled, gold }) {
  return <div style={{ width: 6, height: 6, borderRadius: "50%", background: filled ? (gold ? C.gold : C.muted) : C.dim, transition: "background 0.3s" }} />;
}

// ─── SETUP SCREEN ─────────────────────────────────────────────────────────────

function SetupScreen({ onSave }) {
  const [token, setToken] = useState("");
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState(null);

  const connect = async () => {
    setTesting(true); setError(null);
    try {
      await testConnection(token);
      onSave(token);
    } catch (e) {
      setError("Could not connect to Mealie. Check the token and make sure convive is running on the same machine as Mealie.");
    }
    setTesting(false);
  };

  return (
    <Screen>
      <GFont />
      <div style={{ textAlign: "center", marginBottom: 52 }}>
        <WordMark size={56} />
        <div style={{ color: C.muted, fontSize: 11, letterSpacing: 3, textTransform: "uppercase", marginTop: 8 }}>Connect your Mealie</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <Label>Mealie API token</Label>
          <Input value={token} onChange={e => setToken(e.target.value)} placeholder="Paste your long-lived token" type="password" />
          <div style={{ color: C.dim, fontSize: 11, marginTop: 6, lineHeight: 1.7 }}>
            Mealie → Profile → API Tokens → Generate
          </div>
        </div>
        <ErrorBox message={error} />
        <PrimaryButton onClick={connect} disabled={!token || testing}>
          {testing ? "Connecting…" : "Connect"}
        </PrimaryButton>
      </div>
    </Screen>
  );
}

// ─── HOME SCREEN ──────────────────────────────────────────────────────────────

function HomeScreen({ onStart, onJoin, onReset, connected }) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [tab, setTab] = useState("start");

  return (
    <Screen>
      <GFont />
      <div style={{ textAlign: "center", marginBottom: 56 }}>
        <WordMark size={64} />
        <div style={{ color: C.dim, fontSize: 11, letterSpacing: 3, textTransform: "uppercase", marginTop: 10 }}>
          swipe · match · cook
        </div>
        <div style={{ marginTop: 12, display: "inline-flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: connected ? C.green : C.red }} />
          <span style={{ color: C.muted, fontSize: 11 }}>{connected ? "server connected" : "connecting…"}</span>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <Label>Your name</Label>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Dan" />
        </div>

        <div style={{ display: "flex", background: "#181818", borderRadius: 10, padding: 3 }}>
          {["start", "join"].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, padding: "10px", borderRadius: 8, border: "none",
              background: tab === t ? "#252525" : "transparent",
              color: tab === t ? C.text : C.muted,
              fontSize: 13, cursor: "pointer", fontFamily: "Georgia, serif",
              transition: "all 0.2s",
            }}>
              {t === "start" ? "New session" : "Join session"}
            </button>
          ))}
        </div>

        {tab === "start" ? (
          <PrimaryButton onClick={() => name.trim() && onStart(name.trim())} disabled={!name.trim() || !connected}>
            Start →
          </PrimaryButton>
        ) : (
          <>
            <Input
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              placeholder="5-letter code"
              maxLength={5}
              extraStyle={{ textAlign: "center", letterSpacing: 10, fontFamily: "monospace", fontSize: 22 }}
            />
            <PrimaryButton
              onClick={() => name.trim() && code.length === 5 && onJoin(name.trim(), code)}
              disabled={!name.trim() || code.length !== 5 || !connected}
            >
              Join →
            </PrimaryButton>
          </>
        )}

        <div style={{ textAlign: "center", paddingTop: 8 }}>
          <button onClick={onReset} style={{ background: "none", border: "none", color: C.dim, fontSize: 11, cursor: "pointer", letterSpacing: 1.5 }}>
            CHANGE TOKEN
          </button>
        </div>
      </div>
    </Screen>
  );
}

// ─── WAITING SCREEN ───────────────────────────────────────────────────────────

function WaitingScreen({ code, partnerName, onReady }) {
  const [dots, setDots] = useState("");
  useEffect(() => {
    const t = setInterval(() => setDots(d => d.length >= 3 ? "" : d + "."), 500);
    return () => clearInterval(t);
  }, []);

  return (
    <Screen>
      <GFont />
      <div style={{ textAlign: "center", marginBottom: 48 }}><WordMark size={40} /></div>

      <div style={{ textAlign: "center" }}>
        <Label style={{ textAlign: "center", display: "block", marginBottom: 12 }}>Session code</Label>
        <div style={{
          fontFamily: "monospace", fontSize: 52, fontWeight: 900,
          letterSpacing: 14, color: C.gold,
          background: C.goldFaint, borderRadius: 16,
          padding: "20px 28px", border: `1px solid ${C.goldBorder}`,
          marginBottom: 40,
        }}>
          {code}
        </div>

        {!partnerName ? (
          <div style={{ color: C.muted, fontSize: 14 }}>Waiting for your partner{dots}</div>
        ) : (
          <div style={{ animation: "fadeUp 0.4s ease both" }}>
            <div style={{ color: C.green, fontSize: 15, marginBottom: 24 }}>✓ {partnerName} has joined</div>
            <PrimaryButton onClick={onReady}>Start swiping →</PrimaryButton>
          </div>
        )}
      </div>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </Screen>
  );
}

// ─── SWIPE CARD ───────────────────────────────────────────────────────────────

function SwipeCard({ recipe, onSwipe, isTop, depth }) {
  const startX = useRef(null);
  const currX = useRef(0);
  const [drag, setDrag] = useState(false);
  const [offset, setOffset] = useState(0);
  const [stamp, setStamp] = useState(null);
  const [leaving, setLeaving] = useState(null);
  const [imgErr, setImgErr] = useState(false);

  const start = x => { if (!isTop) return; startX.current = x; setDrag(true); };
  const move = x => {
    if (!drag || startX.current == null) return;
    const d = x - startX.current;
    currX.current = d; setOffset(d);
    setStamp(d > 50 ? "oui" : d < -50 ? "non" : null);
  };
  const end = () => {
    if (!drag) return; setDrag(false);
    if (currX.current > 90) { setLeaving("r"); setTimeout(() => onSwipe("right"), 300); }
    else if (currX.current < -90) { setLeaving("l"); setTimeout(() => onSwipe("left"), 300); }
    else { setOffset(0); setStamp(null); }
    startX.current = null; currX.current = 0;
  };

  const scale = 1 - depth * 0.03;
  const ty = depth * 10;
  let tf = `translateX(${offset}px) rotate(${offset * 0.07}deg) scale(${scale}) translateY(${ty}px)`;
  if (leaving === "r") tf = `translateX(130vw) rotate(22deg) scale(1)`;
  if (leaving === "l") tf = `translateX(-130vw) rotate(-22deg) scale(1)`;

  const stampAlpha = Math.min(1, Math.abs(offset) / 90);

  return (
    <div
      onMouseDown={e => start(e.clientX)} onMouseMove={e => move(e.clientX)}
      onMouseUp={end} onMouseLeave={end}
      onTouchStart={e => start(e.touches[0].clientX)}
      onTouchMove={e => { e.preventDefault(); move(e.touches[0].clientX); }}
      onTouchEnd={end}
      style={{
        position: "absolute", inset: 0, borderRadius: 20, overflow: "hidden",
        transform: tf, zIndex: isTop ? 10 : 10 - depth,
        transition: drag ? "none" : leaving ? "transform 0.3s ease" : "transform 0.25s cubic-bezier(.17,.67,.46,1.3)",
        cursor: isTop ? "grab" : "default",
        userSelect: "none", touchAction: "none",
        boxShadow: isTop ? "0 28px 56px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)" : "0 10px 28px rgba(0,0,0,0.3)",
      }}
    >
      {!imgErr ? (
        <img src={recipeImageUrl(recipe)} alt={recipe.name}
          onError={() => setImgErr(true)}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          draggable={false}
        />
      ) : (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 80,
          background: `hsl(${(recipe.name?.charCodeAt(0) || 42) * 19 % 360}, 25%, 18%)` }}>
          🍽️
        </div>
      )}

      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.02) 0%, transparent 35%, rgba(0,0,0,0.78) 100%)" }} />

      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "32px 22px 22px" }}>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 600, color: "white", lineHeight: 1.15, marginBottom: 6 }}>
          {recipe.name}
        </div>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          {recipe.totalTime && <Chip>{recipe.totalTime}</Chip>}
          {recipe.tags?.slice(0, 2).map(t => <Chip key={t.slug}>{t.name}</Chip>)}
        </div>
      </div>

      {stamp === "oui" && (
        <Stamp color={C.green} rotate="-12deg" side="left" alpha={stampAlpha}>Oui</Stamp>
      )}
      {stamp === "non" && (
        <Stamp color={C.red} rotate="12deg" side="right" alpha={stampAlpha}>Non</Stamp>
      )}
    </div>
  );
}

function Chip({ children }) {
  return (
    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.65)", background: "rgba(255,255,255,0.1)", borderRadius: 20, padding: "3px 10px", letterSpacing: 0.3 }}>
      {children}
    </span>
  );
}

function Stamp({ color, rotate, side, alpha, children }) {
  return (
    <div style={{
      position: "absolute", top: 36, [side]: 22,
      border: `3px solid ${color}`, borderRadius: 6,
      padding: "5px 14px", color,
      fontSize: 24, fontWeight: 700, transform: `rotate(${rotate})`,
      fontFamily: "'Cormorant Garamond', serif", letterSpacing: 3,
      opacity: alpha, textTransform: "uppercase", pointerEvents: "none",
    }}>
      {children}
    </div>
  );
}

// ─── SWIPING SCREEN ───────────────────────────────────────────────────────────

function SwipingScreen({ recipes, send, userName, partnerName, onDone }) {
  const [stack, setStack] = useState([...recipes].reverse());
  const [likes, setLikes] = useState([]);
  const [partnerCount, setPartnerCount] = useState(0);
  const total = recipes.length;

  SwipingScreen._setPartnerCount = setPartnerCount;

  const swipe = useCallback((dir) => {
    const recipe = stack[stack.length - 1];
    const newLikes = dir === "right" ? [...likes, recipe.slug] : likes;
    const newStack = stack.slice(0, -1);
    const totalSwiped = total - newStack.length;

    setLikes(newLikes);
    setStack(newStack);

    send({ type: "swipe", slug: recipe.slug, direction: dir, totalSwiped });

    if (newStack.length === 0) {
      send({ type: "done", likes: newLikes });
      onDone(newLikes);
    }
  }, [stack, likes, total, send, onDone]);

  const done = total - stack.length;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column", alignItems: "center", padding: "18px 16px", maxWidth: 480, margin: "0 auto" }}>
      <GFont />

      <div style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
        <div>
          <div style={{ color: C.gold, fontSize: 10, letterSpacing: 2, textTransform: "uppercase", marginBottom: 5 }}>{userName}</div>
          <div style={{ display: "flex", gap: 4 }}>
            {Array.from({ length: Math.min(total, 12) }).map((_, i) => <Dot key={i} filled={i < done} gold />)}
          </div>
        </div>
        <WordMark size={22} />
        <div style={{ textAlign: "right" }}>
          <div style={{ color: C.muted, fontSize: 10, letterSpacing: 2, textTransform: "uppercase", marginBottom: 5 }}>{partnerName || "partner"}</div>
          <div style={{ display: "flex", gap: 4 }}>
            {Array.from({ length: Math.min(total, 12) }).map((_, i) => <Dot key={i} filled={i < partnerCount} />)}
          </div>
        </div>
      </div>

      <div style={{ position: "relative", width: "100%", flex: 1, maxHeight: 440, marginBottom: 28 }}>
        {stack.length === 0 ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: C.dim }}>
            All done…
          </div>
        ) : (
          stack.slice(-3).map((recipe, i, arr) => (
            <SwipeCard
              key={recipe.slug}
              recipe={recipe}
              isTop={i === arr.length - 1}
              depth={arr.length - 1 - i}
              onSwipe={swipe}
            />
          ))
        )}
      </div>

      {stack.length > 0 && (
        <div style={{ display: "flex", gap: 24, alignItems: "center", marginBottom: 12 }}>
          <RoundBtn color={C.red} size={58} onClick={() => swipe("left")}>✕</RoundBtn>
          <RoundBtn color={C.green} size={68} onClick={() => swipe("right")}>♥</RoundBtn>
        </div>
      )}

      <div style={{ color: C.dim, fontSize: 11, letterSpacing: 0.5 }}>
        {likes.length} liked · {stack.length} left
      </div>
    </div>
  );
}

function RoundBtn({ color, size, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      width: size, height: size, borderRadius: "50%",
      background: `${color}14`, border: `1.5px solid ${color}50`,
      color, fontSize: size * 0.35, cursor: "pointer",
      display: "flex", alignItems: "center", justifyContent: "center",
      transition: "background 0.15s",
    }}
      onMouseEnter={e => e.currentTarget.style.background = `${color}28`}
      onMouseLeave={e => e.currentTarget.style.background = `${color}14`}
    >
      {children}
    </button>
  );
}

// ─── RECIPE DRAWER ────────────────────────────────────────────────────────────

function RecipeDrawer({ recipe, token, onClose }) {
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    fetchRecipeDetail(token, recipe.slug).then(setDetail).catch(() => {});
  }, [recipe.slug, token]);

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
      zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center",
      backdropFilter: "blur(6px)",
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "#111", borderRadius: "22px 22px 0 0",
        width: "100%", maxWidth: 500, maxHeight: "88vh", overflowY: "auto",
        boxShadow: "0 -20px 60px rgba(0,0,0,0.5)",
      }}>
        <div style={{ height: 200, position: "relative", overflow: "hidden", borderRadius: "22px 22px 0 0", flexShrink: 0 }}>
          <img src={recipeImageUrl(recipe)} alt={recipe.name}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            onError={e => e.target.style.display = "none"}
          />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(transparent 30%, #111)" }} />
          <button onClick={onClose} style={{
            position: "absolute", top: 14, right: 14,
            background: "rgba(0,0,0,0.55)", border: "none", color: "white",
            width: 30, height: 30, borderRadius: "50%", fontSize: 17,
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          }}>×</button>
        </div>

        <div style={{ padding: "4px 22px 44px" }}>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, fontWeight: 600, color: C.text, lineHeight: 1.2, marginBottom: 4 }}>
            {recipe.name}
          </div>
          {recipe.description && (
            <div style={{ color: C.muted, fontSize: 13, marginBottom: 14, lineHeight: 1.6 }}>{recipe.description}</div>
          )}

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
            {detail?.prepTime && <Chip>Prep {detail.prepTime}</Chip>}
            {detail?.totalTime && <Chip>Total {detail.totalTime}</Chip>}
            {detail?.recipeYield && <Chip>Serves {detail.recipeYield}</Chip>}
          </div>

          <a href={mealieRecipeUrl(recipe.slug)} target="_blank" rel="noreferrer" style={{
            display: "block", textAlign: "center",
            background: C.goldFaint, border: `1px solid ${C.goldBorder}`,
            borderRadius: 12, padding: "12px", color: C.gold,
            fontSize: 13, textDecoration: "none", marginBottom: 24, letterSpacing: 0.5,
          }}>
            Open in Mealie →
          </a>

          {!detail && <div style={{ color: C.dim, textAlign: "center", padding: 24 }}>Loading…</div>}

          {detail?.recipeIngredient?.length > 0 && (
            <DrawerSection title="Ingredients">
              {detail.recipeIngredient.map((ing, i) => (
                <div key={i} style={{ color: "#ccc", fontSize: 13, padding: "7px 0", borderBottom: `1px solid ${C.border}`, display: "flex", gap: 10, lineHeight: 1.5 }}>
                  <span style={{ color: C.gold, fontSize: 8, marginTop: 5, flexShrink: 0 }}>◆</span>
                  <span>
                    {ing.quantity > 0 && <span style={{ color: C.gold }}>{ing.quantity}{ing.unit?.name ? ` ${ing.unit.name}` : ""} </span>}
                    {ing.food?.name || ing.note || ing.display || ""}
                  </span>
                </div>
              ))}
            </DrawerSection>
          )}

          {detail?.recipeInstructions?.length > 0 && (
            <DrawerSection title="Method">
              {detail.recipeInstructions.map((step, i) => (
                <div key={i} style={{ display: "flex", gap: 14, marginBottom: 14, lineHeight: 1.65 }}>
                  <span style={{ color: C.gold, fontWeight: 700, fontSize: 12, minWidth: 20, paddingTop: 1, fontFamily: "Georgia, serif" }}>{i + 1}.</span>
                  <span style={{ color: "#ccc", fontSize: 13 }}>{step.text}</span>
                </div>
              ))}
            </DrawerSection>
          )}

          {detail?.notes?.length > 0 && (
            <DrawerSection title="Notes">
              {detail.notes.map((n, i) => (
                <div key={i} style={{ color: C.muted, fontSize: 13, fontStyle: "italic", marginBottom: 8, lineHeight: 1.6 }}>"{n.text}"</div>
              ))}
            </DrawerSection>
          )}
        </div>
      </div>
    </div>
  );
}

function DrawerSection({ title, children }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ color: C.gold, fontSize: 9, letterSpacing: 3, textTransform: "uppercase", fontFamily: "Georgia, serif", fontWeight: 700, marginBottom: 12 }}>{title}</div>
      {children}
    </div>
  );
}

// ─── RESULTS SCREEN ───────────────────────────────────────────────────────────

function ResultsScreen({ recipes, userLikes, matchSlugs, waitingForPartner, partnerName, token, onAgain }) {
  const [selected, setSelected] = useState(null);

  const matches = matchSlugs
    ? recipes.filter(r => matchSlugs.includes(r.slug))
    : [];

  return (
    <div style={{ minHeight: "100vh", background: C.bg, padding: "32px 20px", maxWidth: 480, margin: "0 auto", fontFamily: "Georgia, serif" }}>
      <GFont />

      <div style={{ textAlign: "center", paddingTop: 20, marginBottom: 32 }}>
        <WordMark size={36} />
        <div style={{ marginTop: 20 }}>
          {waitingForPartner ? (
            <div style={{ color: C.muted, fontSize: 14 }}>Waiting for {partnerName || "partner"} to finish…</div>
          ) : matches.length > 0 ? (
            <>
              <div style={{ color: C.gold, fontSize: 11, letterSpacing: 3, textTransform: "uppercase", marginBottom: 6 }}>Tonight's options</div>
              <div style={{ color: C.muted, fontSize: 13 }}>{matches.length} {matches.length === 1 ? "dish" : "dishes"} you both want</div>
            </>
          ) : (
            <div style={{ color: C.muted, fontSize: 15 }}>No matches this time.<br /><span style={{ fontSize: 13 }}>Different tastes tonight.</span></div>
          )}
        </div>
      </div>

      {!waitingForPartner && (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
            {matches.map((recipe, i) => (
              <div key={recipe.slug} onClick={() => setSelected(recipe)}
                style={{
                  display: "flex", alignItems: "center", gap: 0,
                  background: C.surface, border: `1px solid ${C.border}`,
                  borderRadius: 14, overflow: "hidden", cursor: "pointer",
                  animation: `fadeUp 0.4s ease ${i * 0.07}s both`,
                  transition: "border-color 0.2s",
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = C.gold}
                onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
              >
                <div style={{ width: 78, height: 78, flexShrink: 0 }}>
                  <img src={recipeImageUrl(recipe)} alt={recipe.name}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    onError={e => { e.target.style.display = "none"; e.target.parentElement.style.background = "#1a1a1a"; }}
                  />
                </div>
                <div style={{ flex: 1, padding: "0 14px" }}>
                  <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 19, color: C.text, lineHeight: 1.2 }}>{recipe.name}</div>
                  {recipe.totalTime && <div style={{ color: C.muted, fontSize: 11, marginTop: 3 }}>⏱ {recipe.totalTime}</div>}
                </div>
                <div style={{ color: C.gold, fontSize: 18, paddingRight: 16 }}>›</div>
              </div>
            ))}
          </div>

          <GhostButton onClick={onAgain}>Swipe again</GhostButton>
        </>
      )}

      {selected && <RecipeDrawer recipe={selected} token={token} onClose={() => setSelected(null)} />}
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}

// ─── LOADING / ERROR FULLSCREEN ───────────────────────────────────────────────

function Screen({ children }) {
  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32, maxWidth: 400, margin: "0 auto" }}>
      {children}
    </div>
  );
}

function LoadingScreen({ message }) {
  return (
    <Screen>
      <GFont />
      <WordMark size={48} />
      <div style={{ color: C.dim, fontSize: 12, letterSpacing: 2, marginTop: 20 }}>{message}</div>
    </Screen>
  );
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────────

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem("convive_token") || null);
  const [screen, setScreen] = useState("home");
  const [sessionCode, setSessionCode] = useState(null);
  const [role, setRole] = useState(null);
  const [userName, setUserName] = useState("");
  const [partnerName, setPartnerName] = useState("");
  const [recipes, setRecipes] = useState([]);
  const [userLikes, setUserLikes] = useState([]);
  const [matchSlugs, setMatchSlugs] = useState(null);
  const [waitingForPartner, setWaitingForPartner] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const pendingRef = useRef(null);

  const handleServerMessage = useCallback((msg) => {
    switch (msg.type) {
      case "created":
        setSessionCode(msg.code);
        setScreen("waiting");
        break;
      case "joined":
        setSessionCode(msg.code);
        setPartnerName(msg.hostName);
        if (pendingRef.current?.allRecipes) {
          // Recipes already fetched — process immediately
          const all = pendingRef.current.allRecipes;
          const ordered = msg.recipes
            .map(slug => all.find(r => r.slug === slug))
            .filter(Boolean);
          setRecipes(ordered.length > 0 ? ordered : all.slice(0, 12));
          pendingRef.current = null;
          setScreen("swiping");
        } else {
          // Fetch not done yet — store message and wait
          pendingRef.current = { joinedMsg: msg };
        }
        break;
      case "partner_joined":
        setPartnerName(msg.partnerName);
        break;
      case "partner_progress":
        if (SwipingScreen._setPartnerCount) SwipingScreen._setPartnerCount(msg.count);
        break;
      case "partner_done":
        setWaitingForPartner(false);
        break;
      case "matches":
        setMatchSlugs(msg.slugs);
        setWaitingForPartner(false);
        setScreen("results");
        break;
      case "partner_left":
        alert(msg.message || "Your partner disconnected.");
        break;
      case "error":
        alert(msg.message);
        break;
    }
  }, []);

  const { send, connected } = useSocket(handleServerMessage);

  const saveToken = (t) => {
    localStorage.setItem("convive_token", t);
    setToken(t);
  };

  const loadAndStart = async (name) => {
    setLoading(true); setLoadError(null);
    try {
      const all = await fetchRecipes(token, 60);
      const shuffled = all.sort(() => Math.random() - 0.5).slice(0, CARDS_PER_SESSION);
      setRecipes(shuffled);
      setUserName(name);
      setRole("host");
      send({ type: "create", name });
      // Send recipes immediately so guest gets them when they join
      send({ type: "recipes", recipes: shuffled.map(r => r.slug) });
    } catch (e) {
      setLoadError(e.message);
    }
    setLoading(false);
  };

  const handleWaitingReady = () => {
    setScreen("swiping");
  };

  const handleJoin = async (name, code) => {
    setUserName(name);
    setRole("guest");
    setScreen("waiting");
    try {
      const all = await fetchRecipes(token, 60);
      // If joined message already arrived, process it now
      if (pendingRef.current?.joinedMsg) {
        const msg = pendingRef.current.joinedMsg;
        const ordered = msg.recipes
          .map(slug => all.find(r => r.slug === slug))
          .filter(Boolean);
        setRecipes(ordered.length > 0 ? ordered : all.slice(0, 12));
        pendingRef.current = null;
        setScreen("swiping");
      } else {
        pendingRef.current = { allRecipes: all };
        send({ type: "join", name, code });
      }
    } catch (e) {
      setLoadError(e.message);
      setScreen("home");
    }
  };

  const handleSwipingDone = (likes) => {
    setUserLikes(likes);
    setWaitingForPartner(true);
    setScreen("results");
  };

  const handleAgain = async () => {
    setMatchSlugs(null);
    setUserLikes([]);
    setWaitingForPartner(false);
    if (role === "host") {
      await loadAndStart(userName);
    } else {
      setScreen("swiping");
    }
  };

  if (!token) return <SetupScreen onSave={saveToken} />;
  if (loading) return <LoadingScreen message="Loading recipes…" />;
  if (loadError) return (
    <Screen>
      <GFont />
      <ErrorBox message={loadError} />
      <div style={{ marginTop: 16 }}>
        <GhostButton onClick={() => { localStorage.removeItem("convive_token"); setToken(null); }}>
          Check token
        </GhostButton>
      </div>
    </Screen>
  );

  if (screen === "home") return (
    <HomeScreen
      onStart={loadAndStart}
      onJoin={handleJoin}
      onReset={() => { localStorage.removeItem("convive_token"); setToken(null); }}
      connected={connected}
    />
  );

  if (screen === "waiting") return (
    <WaitingScreen key={partnerName} code={sessionCode} partnerName={partnerName} onReady={handleWaitingReady} />
  );

  if (screen === "swiping") return (
    <SwipingScreen
      recipes={recipes}
      send={send}
      userName={userName}
      partnerName={partnerName}
      onDone={handleSwipingDone}
    />
  );

  if (screen === "results") return (
    <ResultsScreen
      recipes={recipes}
      userLikes={userLikes}
      matchSlugs={matchSlugs}
      waitingForPartner={waitingForPartner}
      partnerName={partnerName}
      token={token}
      onAgain={handleAgain}
    />
  );
}
