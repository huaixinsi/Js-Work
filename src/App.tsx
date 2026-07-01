import { FormEvent, useEffect, useMemo, useState } from "react";
import { api, setAuthToken } from "./api";
import type { AdminStats, Movie, Order, Review, Seat, Showtime, User } from "./types";

type Tab = "home" | "ticket" | "profile" | "admin";
type LoginRole = "user" | "admin";
type AuthMode = "login" | "register";

const statusLabel: Record<string, string> = {
  available: "可选",
  sold: "已售",
  locked: "锁定",
  broken: "故障"
};

function parseTags(tags: User["preference_tags"]) {
  return Array.isArray(tags) ? tags : JSON.parse(tags || "[]");
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function App() {
  const [tab, setTab] = useState<Tab>("home");
  const [user, setUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [loginRole, setLoginRole] = useState<LoginRole>("user");
  const [username, setUsername] = useState("demo");
  const [password, setPassword] = useState("demo");
  const [nickname, setNickname] = useState("");
  const [preferenceTags, setPreferenceTags] = useState("科幻,悬疑,IMAX");
  const [movies, setMovies] = useState<Movie[]>([]);
  const [recommendations, setRecommendations] = useState<{
    hot: Movie[];
    local: Movie[];
    topRated: Movie[];
  }>({ hot: [], local: [], topRated: [] });
  const [selectedMovieId, setSelectedMovieId] = useState(1);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [showtimes, setShowtimes] = useState<Showtime[]>([]);
  const [selectedShowtimeId, setSelectedShowtimeId] = useState<number | null>(null);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<number[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [reviewRating, setReviewRating] = useState(8);
  const [reviewContent, setReviewContent] = useState("");
  const [checkout, setCheckout] = useState<{
    id: number;
    total: number;
    ticketCode: string;
    expiresAt: string;
  } | null>(null);
  const [message, setMessage] = useState("请先登录");

  const selectedMovie = movies.find((movie) => movie.id === selectedMovieId) ?? movies[0];
  const selectedShowtime = showtimes.find((showtime) => showtime.id === selectedShowtimeId) ?? null;
  const selectedSeatRows = seats.filter((seat) => selectedSeats.includes(seat.id));

  const countdown = useMemo(() => {
    if (!checkout) return "15:00";
    const diff = Math.max(0, new Date(checkout.expiresAt).getTime() - Date.now());
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }, [checkout]);

  useEffect(() => {
    refreshCatalog()
      .catch((error: Error) => setMessage(error.message));

    api.user()
      .then((savedUser) => enterSystem(savedUser))
      .catch(() => setAuthToken(""));
  }, []);

  async function refreshCatalog() {
    const [movieData, recommendationData, showtimeData] = await Promise.all([
      api.movies(),
      api.recommendations(),
      api.showtimes()
    ]);
    setMovies(movieData);
    setRecommendations(recommendationData);
    setShowtimes(showtimeData);
    setSelectedMovieId(movieData[0]?.id ?? 1);
    setSelectedShowtimeId(showtimeData[0]?.id ?? null);
  }

  async function refreshMovieDetail(movieId = selectedMovieId) {
    const data = await api.movie(movieId);
    setReviews(data.reviews);
  }

  useEffect(() => {
    if (!selectedMovieId) return;
    refreshMovieDetail(selectedMovieId).catch(() => setReviews([]));
    api.showtimes(selectedMovieId).then((data) => {
      setShowtimes(data);
      setSelectedShowtimeId(data[0]?.id ?? null);
    });
  }, [selectedMovieId]);

  useEffect(() => {
    if (!selectedShowtimeId || user?.role !== "user") return;
    api.seats(selectedShowtimeId).then((data) => {
      setSeats(data);
      setSelectedSeats([]);
      setCheckout(null);
    });
  }, [selectedShowtimeId, user?.role]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (checkout) setCheckout({ ...checkout });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [checkout]);

  async function enterSystem(nextUser: User) {
    setUser(nextUser);
    if (nextUser.role === "admin") {
      setTab("admin");
      setMessage("管理员已登录，可以查看票房、用户、订单和数据报表");
      setAdminStats(await api.adminStats());
      setOrders(await api.orders());
      return;
    }

    setTab("home");
    setMessage("用户已登录，可以选座购票");
    setOrders(await api.orders());
  }

  async function handleLogin(event: FormEvent) {
    event.preventDefault();
    try {
      const result =
        authMode === "register"
          ? await api.register({ username, password, nickname, preferenceTags })
          : await api.login({ username, password, role: loginRole });
      setAuthToken(result.token);
      await enterSystem(result.user);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "登录失败");
    }
  }

  function logout() {
    setAuthToken("");
    setUser(null);
    setOrders([]);
    setAdminStats(null);
    setCheckout(null);
    setMessage("已退出登录");
  }

  function toggleRole(role: LoginRole) {
    setAuthMode("login");
    setLoginRole(role);
    if (role === "admin") {
      setUsername("admin");
      setPassword("admin123");
    } else {
      setUsername("demo");
      setPassword("demo");
    }
  }

  function toggleAuthMode(mode: AuthMode) {
    setAuthMode(mode);
    if (mode === "register") {
      setLoginRole("user");
      setUsername("");
      setPassword("");
      setNickname("");
      setMessage("注册账号后将以普通用户身份进入系统");
      return;
    }

    toggleRole("user");
    setMessage("请先登录");
  }

  function toggleSeat(seat: Seat) {
    if (seat.status !== "available") return;
    setSelectedSeats((current) =>
      current.includes(seat.id) ? current.filter((id) => id !== seat.id) : [...current, seat.id]
    );
  }

  async function createOrder() {
    if (!user || !selectedShowtimeId || selectedSeats.length === 0) {
      setMessage("请先选择场次和座位");
      return;
    }

    const order = await api.createOrder({
      showtimeId: selectedShowtimeId,
      seatIds: selectedSeats,
      couponAmount: 10,
      pointsUsed: 200
    });
    setCheckout(order);
    setMessage(`订单已创建，取票码 ${order.ticketCode}`);
  }

  async function payOrder() {
    if (!checkout) return;
    await api.payOrder(checkout.id);
    setMessage("支付成功，座位已售出");
    setOrders(await api.orders());
    setSeats(selectedShowtimeId ? await api.seats(selectedShowtimeId) : []);
  }

  async function submitReview() {
    if (!selectedMovie) return;
    const created = await api.createReview(selectedMovie.id, {
      rating: reviewRating,
      content: reviewContent
    });
    setReviews((current) => [created, ...current]);
    setReviewContent("");
    setMessage("评论已发布到本地评论区");
  }

  async function syncRealMovies() {
    const result = await api.syncTmdb();
    await refreshCatalog();
    setAdminStats(await api.adminStats());
    setMessage(`已同步 ${result.synced} 部 TMDB 近两年热门电影`);
  }

  if (!user) {
    return (
      <main>
        <section className="login-shell">
          <div className="login-copy">
            <span className="eyebrow">Cinema OS</span>
            <h1>星幕电影推荐与票务系统</h1>
            <p>{message}</p>
          </div>
          <form className="login-panel" onSubmit={handleLogin}>
            <h2>{authMode === "register" ? "用户注册" : loginRole === "admin" ? "管理员登录" : "用户登录"}</h2>
            <div className="role-switch">
              <button type="button" className={authMode === "login" && loginRole === "user" ? "active" : ""} onClick={() => toggleRole("user")}>
                用户登录
              </button>
              <button type="button" className={authMode === "login" && loginRole === "admin" ? "active" : ""} onClick={() => toggleRole("admin")}>
                管理员登录
              </button>
              <button type="button" className={authMode === "register" ? "active" : ""} onClick={() => toggleAuthMode("register")}>
                用户注册
              </button>
            </div>
            <label>
              账号
              <input value={username} onChange={(event) => setUsername(event.target.value)} />
            </label>
            <label>
              密码
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
            </label>
            {authMode === "register" && (
              <>
                <label>
                  昵称
                  <input value={nickname} onChange={(event) => setNickname(event.target.value)} />
                </label>
                <label>
                  偏好标签
                  <input value={preferenceTags} onChange={(event) => setPreferenceTags(event.target.value)} />
                </label>
              </>
            )}
            <button type="submit">{authMode === "register" ? "注册并进入系统" : "登录系统"}</button>
            <p className="hint">
              {authMode === "register" ? "注册仅创建普通用户，不提供头像上传。" : "用户：demo / demo；管理员：admin / admin123"}
            </p>
          </form>
        </section>
      </main>
    );
  }

  const navItems: Array<[Tab, string]> =
    user.role === "admin"
      ? [["admin", "后台管理"]]
      : [
          ["home", "首页推荐"],
          ["ticket", "选座购票"],
          ["profile", "用户中心"]
        ];

  return (
    <main>
      <header className="topbar">
        <div>
          <span className="eyebrow">Cinema OS</span>
          <h1>星幕电影推荐与票务系统</h1>
          <p className="session-line">{user.nickname} · {user.role === "admin" ? "管理员" : "用户"}</p>
        </div>
        <nav>
          {navItems.map(([key, label]) => (
            <button className={tab === key ? "active" : ""} key={key} onClick={() => setTab(key)}>
              {label}
            </button>
          ))}
          <button onClick={logout}>退出</button>
        </nav>
      </header>

      <section className="hero">
        <div>
          <p>{message}</p>
          <h2>{user.role === "admin" ? "运营控制台" : selectedMovie?.title ?? "加载中"}</h2>
          <span>{user.role === "admin" ? "集中管理票房统计、用户、订单与数据报表。" : selectedMovie?.summary}</span>
        </div>
        <div className="hero-panel">
          <strong>{user.role === "admin" ? adminStats?.summary.orderCount ?? 0 : selectedMovie?.rating}</strong>
          <span>{user.role === "admin" ? "订单数" : "综合评分"}</span>
        </div>
      </section>

      {tab === "home" && user.role === "user" && (
        <section className="layout">
          <div className="main-column">
            <Section title="热门推荐" movies={recommendations.hot} onPick={setSelectedMovieId} />
            <Section title="同城热映" movies={recommendations.local} onPick={setSelectedMovieId} />
            <Section title="评分最高" movies={recommendations.topRated} onPick={setSelectedMovieId} />
          </div>
          <MovieDetail
            movie={selectedMovie}
            reviews={reviews}
            rating={reviewRating}
            content={reviewContent}
            onRatingChange={setReviewRating}
            onContentChange={setReviewContent}
            onSubmitReview={submitReview}
          />
        </section>
      )}

      {tab === "ticket" && user.role === "user" && (
        <section className="ticket-grid">
          <div className="panel">
            <h3>影片与场次</h3>
            <div className="movie-list">
              {movies.map((movie) => (
                <button
                  key={movie.id}
                  className={movie.id === selectedMovieId ? "movie-row active" : "movie-row"}
                  onClick={() => setSelectedMovieId(movie.id)}
                >
                  <img src={movie.poster} alt={movie.title} />
                  <span>{movie.title}</span>
                  <b>{movie.rating}</b>
                </button>
              ))}
            </div>
            <div className="showtime-list">
              {showtimes.map((showtime) => (
                <button
                  key={showtime.id}
                  className={showtime.id === selectedShowtimeId ? "active" : ""}
                  onClick={() => setSelectedShowtimeId(showtime.id)}
                >
                  <b>{formatDate(showtime.starts_at)}</b>
                  <span>{showtime.cinema_name} · {showtime.hall_type} · ¥{showtime.price}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="panel seat-panel">
            <h3>可视化选座</h3>
            <div className="screen">银幕 SCREEN</div>
            <svg className="seat-map" viewBox="0 0 520 360" role="img" aria-label="座位图">
              {seats.map((seat) => {
                const x = 40 + (seat.seat_number - 1) * 58;
                const y = 42 + (seat.row_label.charCodeAt(0) - 65) * 46;
                const selected = selectedSeats.includes(seat.id);
                return (
                  <g key={seat.id} onClick={() => toggleSeat(seat)} className={`seat ${seat.status} ${selected ? "selected" : ""}`}>
                    <rect x={x} y={y} width="38" height="30" rx="7" />
                    <text x={x + 19} y={y + 20}>{seat.row_label}{seat.seat_number}</text>
                  </g>
                );
              })}
            </svg>
            <div className="legend">
              {Object.entries(statusLabel).map(([key, label]) => <span key={key} className={key}>{label}</span>)}
              <span className="selected">已选</span>
            </div>
          </div>

          <div className="panel checkout">
            <h3>订单确认</h3>
            <p>{selectedShowtime?.movie_title} · {selectedShowtime?.cinema_name}</p>
            <p>已选：{selectedSeatRows.map((seat) => `${seat.row_label}${seat.seat_number}`).join("、") || "暂无"}</p>
            <p>优惠券 ¥10，积分抵扣 ¥2，会员折扣 {user.member_discount}</p>
            <button onClick={createOrder}>创建订单</button>
            {checkout && (
              <div className="ticket-code">
                <span>支付倒计时 {countdown}</span>
                <strong>¥{checkout.total}</strong>
                <code>{checkout.ticketCode}</code>
                <button onClick={payOrder}>模拟支付</button>
              </div>
            )}
          </div>
        </section>
      )}

      {tab === "profile" && user.role === "user" && (
        <section className="profile-grid">
          <div className="panel profile-card">
            <img src={user.avatar} alt={user.nickname} />
            <h3>{user.nickname}</h3>
            <p>{user.level} · 积分 {user.points} · 余额 ¥{user.balance}</p>
            <div>{parseTags(user.preference_tags).map((tag: string) => <span className="tag" key={tag}>{tag}</span>)}</div>
          </div>
          <OrderPanel title="我的订单" orders={orders} />
        </section>
      )}

      {tab === "admin" && user.role === "admin" && adminStats && (
        <section className="admin-grid">
          <Metric label="实时票房" value={`¥${Number(adminStats.summary.boxOffice).toFixed(2)}`} />
          <Metric label="上座率" value={`${adminStats.attendanceRate}%`} />
          <Metric label="订单数" value={String(adminStats.summary.orderCount)} />
          <Metric label="用户增长" value={adminStats.userGrowth.at(-1)?.toString() ?? "0"} />
          <div className="panel">
            <h3>热门影片排行</h3>
            <button className="sync-button" onClick={syncRealMovies}>同步近两年热门电影</button>
            {adminStats.popularMovies.map((movie) => (
              <p className="rank" key={movie.title}><span>{movie.title}</span><b>{movie.orders} 单</b></p>
            ))}
          </div>
          <div className="panel">
            <h3>用户管理</h3>
            {adminStats.users.map((managedUser) => (
              <p className="rank" key={managedUser.id}><span>{managedUser.nickname} · {managedUser.level}</span><b>{managedUser.status}</b></p>
            ))}
          </div>
          <OrderPanel title="订单管理" orders={orders} />
          <div className="panel wide">
            <h3>数据报表与系统日志</h3>
            {adminStats.logs.map((log) => (
              <p className="rank" key={log.id}><span>{log.action}</span><b>{log.operator}</b></p>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function Section({ title, movies, onPick }: { title: string; movies: Movie[]; onPick: (id: number) => void }) {
  return (
    <div>
      <h3>{title}</h3>
      <div className="cards">
        {movies.map((movie) => (
          <button className="movie-card" key={movie.id} onClick={() => onPick(movie.id)}>
            <img src={movie.poster} alt={movie.title} />
            <span>{movie.title}</span>
            <b>{movie.genre}</b>
          </button>
        ))}
      </div>
    </div>
  );
}

function MovieDetail({
  movie,
  reviews,
  rating,
  content,
  onRatingChange,
  onContentChange,
  onSubmitReview
}: {
  movie?: Movie;
  reviews: Review[];
  rating: number;
  content: string;
  onRatingChange: (rating: number) => void;
  onContentChange: (content: string) => void;
  onSubmitReview: () => void;
}) {
  if (!movie) return null;

  return (
    <aside className="panel detail">
      <img src={movie.poster} alt={movie.title} />
      <h3>{movie.title}</h3>
      <p>{movie.genre} · {movie.region} · {movie.release_year}</p>
      <p>{movie.actors}</p>
      <p>{movie.summary}</p>
      <div className="actions">
        <button>想看</button>
        <button>看过</button>
      </div>
      <h4>短评</h4>
      <div className="review-form">
        <label>
          评分
          <input
            max="10"
            min="0"
            step="0.5"
            type="number"
            value={rating}
            onChange={(event) => onRatingChange(Number(event.target.value))}
          />
        </label>
        <label>
          本地评论
          <textarea
            maxLength={300}
            placeholder="写下你对这部电影的看法"
            value={content}
            onChange={(event) => onContentChange(event.target.value)}
          />
        </label>
        <button onClick={onSubmitReview}>发布评论</button>
      </div>
      {reviews.map((review) => (
        <blockquote key={review.id}>
          <strong>{review.nickname ?? "本地用户"} · {review.rating} 分</strong>
          <span>{review.content}</span>
        </blockquote>
      ))}
    </aside>
  );
}

function OrderPanel({ title, orders }: { title: string; orders: Order[] }) {
  return (
    <div className="panel">
      <h3>{title}</h3>
      {orders.map((order) => (
        <article className="order" key={order.id}>
          <b>{order.movie_title}</b>
          <span>{order.cinema_name} · {formatDate(order.starts_at)}</span>
          <code>{order.ticket_code}</code>
          <em>{order.status}</em>
        </article>
      ))}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default App;
