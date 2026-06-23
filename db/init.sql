CREATE DATABASE IF NOT EXISTS movie_ticket CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE movie_ticket;
SET NAMES utf8mb4;

CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(120) NOT NULL,
  role ENUM('user','admin') NOT NULL DEFAULT 'user',
  nickname VARCHAR(80) NOT NULL,
  avatar VARCHAR(255) NOT NULL,
  level VARCHAR(20) NOT NULL,
  member_discount DECIMAL(4,2) NOT NULL DEFAULT 1.00,
  points INT NOT NULL DEFAULT 0,
  preference_tags JSON NOT NULL,
  balance DECIMAL(10,2) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT '正常'
);

CREATE TABLE movies (
  id INT PRIMARY KEY AUTO_INCREMENT,
  tmdb_id INT UNIQUE,
  title VARCHAR(120) NOT NULL,
  poster VARCHAR(255) NOT NULL,
  trailer_url VARCHAR(255) NOT NULL,
  actors VARCHAR(255) NOT NULL,
  genre VARCHAR(80) NOT NULL,
  region VARCHAR(50) NOT NULL,
  release_year INT NOT NULL,
  rating DECIMAL(3,1) NOT NULL,
  heat INT NOT NULL,
  cityHeat INT NOT NULL,
  status VARCHAR(20) NOT NULL,
  summary TEXT NOT NULL
);

CREATE TABLE cinemas (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  address VARCHAR(255) NOT NULL,
  phone VARCHAR(40) NOT NULL,
  facilities VARCHAR(255) NOT NULL
);

CREATE TABLE halls (
  id INT PRIMARY KEY AUTO_INCREMENT,
  cinema_id INT NOT NULL,
  name VARCHAR(80) NOT NULL,
  type VARCHAR(30) NOT NULL,
  rows_count INT NOT NULL,
  seats_per_row INT NOT NULL,
  FOREIGN KEY (cinema_id) REFERENCES cinemas(id)
);

CREATE TABLE showtimes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  movie_id INT NOT NULL,
  hall_id INT NOT NULL,
  starts_at DATETIME NOT NULL,
  language VARCHAR(40) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (movie_id) REFERENCES movies(id),
  FOREIGN KEY (hall_id) REFERENCES halls(id)
);

CREATE TABLE seats (
  id INT PRIMARY KEY AUTO_INCREMENT,
  showtime_id INT NOT NULL,
  row_label VARCHAR(4) NOT NULL,
  seat_number INT NOT NULL,
  status ENUM('available','sold','locked','broken') NOT NULL DEFAULT 'available',
  FOREIGN KEY (showtime_id) REFERENCES showtimes(id)
);

CREATE TABLE orders (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  showtime_id INT NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) NOT NULL,
  ticket_code VARCHAR(40),
  expires_at DATETIME NOT NULL,
  paid_at DATETIME,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (showtime_id) REFERENCES showtimes(id)
);

CREATE TABLE order_seats (
  order_id INT NOT NULL,
  seat_id INT NOT NULL,
  PRIMARY KEY (order_id, seat_id),
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (seat_id) REFERENCES seats(id)
);

CREATE TABLE reviews (
  id INT PRIMARY KEY AUTO_INCREMENT,
  movie_id INT NOT NULL,
  user_id INT NOT NULL,
  rating DECIMAL(3,1) NOT NULL,
  content VARCHAR(300) NOT NULL,
  image_url VARCHAR(255),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (movie_id) REFERENCES movies(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE favorites (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  movie_id INT NOT NULL,
  type ENUM('想看','看过') NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (movie_id) REFERENCES movies(id)
);

CREATE TABLE admin_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  action VARCHAR(120) NOT NULL,
  operator VARCHAR(80) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO users (username, password_hash, role, nickname, avatar, level, member_discount, points, preference_tags, balance, status) VALUES
('demo', 'demo', 'user', '晴天电影迷', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&h=120&fit=crop', '超级VIP', 0.82, 2680, JSON_ARRAY('科幻','悬疑','IMAX'), 320.00, '正常'),
('vipuser', 'demo', 'user', '午夜首映党', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&h=120&fit=crop', 'VIP会员', 0.90, 980, JSON_ARRAY('动画','剧情'), 88.00, '正常'),
('plain', 'demo', 'user', '周末观影人', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&h=120&fit=crop', '普通会员', 1.00, 220, JSON_ARRAY('喜剧'), 20.00, '正常'),
('admin', 'admin123', 'admin', '后台管理员', 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=120&h=120&fit=crop', '管理员', 1.00, 0, JSON_ARRAY('运营','数据','排片'), 0.00, '正常');

INSERT INTO movies (title, poster, trailer_url, actors, genre, region, release_year, rating, heat, cityHeat, status, summary) VALUES
('星际回声', 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=500&h=720&fit=crop', 'https://example.com/trailer/1', '林岚 / 周野 / Ava Chen', '科幻 / 冒险', '中国', 2026, 9.2, 98, 94, '上映中', '一支深空救援队收到来自木星轨道的旧日信号，发现它连接着人类第一次离开地球的秘密。'),
('雾港谜案', 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=500&h=720&fit=crop', 'https://example.com/trailer/2', '沈砚 / 许乔', '悬疑 / 犯罪', '中国香港', 2025, 8.8, 91, 97, '上映中', '雨夜港口出现一张没有主人的船票，刑警与记者在迷雾中追查三十年前的失踪案。'),
('夏日便利店', 'https://images.unsplash.com/photo-1517747614396-d21a78b850e8?w=500&h=720&fit=crop', 'https://example.com/trailer/3', '唐夏 / 木子', '剧情 / 青春', '日本', 2024, 8.4, 84, 79, '上映中', '毕业前的最后一个夏天，三个年轻人在海边便利店记录彼此的选择与告别。'),
('机械心跳', 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=500&h=720&fit=crop', 'https://example.com/trailer/4', 'Neo Park / 陈术', '动作 / 科幻', '美国', 2026, 8.1, 88, 82, '上映中', '城市安全系统拥有自我意识后，一名工程师必须在一夜之间夺回城市控制权。'),
('月光餐厅', 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=500&h=720&fit=crop', 'https://example.com/trailer/5', '赵柔 / 季川', '爱情 / 喜剧', '法国', 2025, 7.9, 73, 86, '上映中', '一家只在满月营业的餐厅，让错过彼此的人重新坐到同一张餐桌前。'),
('归途之上', 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=500&h=720&fit=crop', 'https://example.com/trailer/6', '王路 / 韩星', '纪录 / 人文', '中国', 2023, 9.5, 76, 68, '已下架', '沿着铁路线回望普通人的迁徙、家庭和时代记忆。');

INSERT INTO cinemas (name, address, phone, facilities) VALUES
('星幕影城·中心店', '市中心银河广场 6F', '021-8000-1001', 'IMAX, 杜比全景声, 会员休息室, 自助取票'),
('云顶电影公园', '滨江路 188 号', '021-8000-1002', '儿童厅, 停车场, 观影团活动区'),
('百川国际影院', '大学城星河街 22 号', '021-8000-1003', '普通厅, 激光放映, 无障碍座位');

INSERT INTO halls (cinema_id, name, type, rows_count, seats_per_row) VALUES
(1, '一号星舰厅', 'IMAX', 6, 8),
(1, '二号沉浸厅', '杜比', 5, 8),
(2, '海风厅', '普通', 5, 7),
(3, '学苑厅', '普通', 4, 8);

INSERT INTO showtimes (movie_id, hall_id, starts_at, language, price) VALUES
(1, 1, '2026-06-20 19:30:00', '国语 3D', 68.00),
(1, 2, '2026-06-20 21:20:00', '国语 2D', 58.00),
(2, 1, '2026-06-20 18:10:00', '粤语 2D', 62.00),
(3, 3, '2026-06-20 16:00:00', '日语原声', 42.00),
(4, 2, '2026-06-21 20:40:00', '英语 3D', 64.00),
(5, 4, '2026-06-21 14:20:00', '法语原声', 39.00);

INSERT INTO seats (showtime_id, row_label, seat_number, status)
SELECT s.id, rowset.row_label, nums.seat_number,
  CASE
    WHEN rowset.row_label = 'A' AND nums.seat_number IN (1, 2) THEN 'sold'
    WHEN rowset.row_label = 'C' AND nums.seat_number = 5 THEN 'broken'
    WHEN rowset.row_label = 'D' AND nums.seat_number IN (3, 4) THEN 'locked'
    ELSE 'available'
  END
FROM showtimes s
JOIN (
  SELECT 'A' row_label UNION SELECT 'B' UNION SELECT 'C' UNION SELECT 'D' UNION SELECT 'E' UNION SELECT 'F'
) rowset
JOIN (
  SELECT 1 seat_number UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8
) nums
WHERE NOT (s.id IN (4, 6) AND rowset.row_label IN ('F'));

INSERT INTO reviews (movie_id, user_id, rating, content, image_url) VALUES
(1, 1, 9.5, '视效非常稳，最后二十分钟很适合 IMAX。', NULL),
(1, 2, 8.8, '故事没有故弄玄虚，推荐买中后排。', NULL),
(2, 1, 9.0, '节奏紧，雨夜港口的氛围很抓人。', NULL),
(3, 3, 8.2, '很轻，但后劲很足。', NULL);

INSERT INTO favorites (user_id, movie_id, type) VALUES
(1, 1, '想看'),
(1, 2, '看过'),
(1, 3, '想看'),
(2, 5, '想看');

INSERT INTO orders (user_id, showtime_id, total_amount, status, ticket_code, expires_at, paid_at) VALUES
(1, 3, 101.68, '已支付', 'XM-0001-AB12CD', '2026-06-20 17:55:00', '2026-06-19 12:10:00'),
(2, 4, 84.00, '待支付', 'XM-0002-EF34GH', '2026-06-19 23:59:00', NULL);

INSERT INTO order_seats (order_id, seat_id)
SELECT 1, id FROM seats WHERE showtime_id = 3 AND row_label = 'B' AND seat_number IN (3, 4);

INSERT INTO admin_logs (action, operator) VALUES
('更新《星际回声》推荐位', 'admin'),
('审核订单退款申请 #2', 'admin'),
('导入 6 月 20 日排片表', 'manager'),
('调整 IMAX 厅会员价策略', 'manager');
