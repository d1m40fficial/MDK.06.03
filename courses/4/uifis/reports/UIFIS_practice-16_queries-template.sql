-- UIFIS practice 16: query templates
-- 1. Стоимость каждого заказа
SELECT o.order_id, o.customer, SUM(p.price * oi.qty) AS total
FROM orders o
JOIN order_items oi ON oi.order_id = o.order_id
JOIN products p ON p.product_id = oi.product_id
GROUP BY o.order_id, o.customer
ORDER BY total DESC;

-- 2. Потребность в материалах
SELECT m.code, m.name, SUM(n.qty * oi.qty) AS required
FROM order_items oi
JOIN norms n ON n.product_id = oi.product_id
JOIN materials m ON m.material_id = n.material_id
GROUP BY m.material_id, m.code, m.name
ORDER BY required DESC;

-- 3. Топ-3 продукта по выручке
SELECT p.code, p.name, SUM(p.price * oi.qty) AS revenue
FROM order_items oi
JOIN products p ON p.product_id = oi.product_id
GROUP BY p.product_id, p.code, p.name
ORDER BY revenue DESC
LIMIT 3;

-- 4. Заказы дороже среднего
SELECT order_id, total
FROM (
  SELECT o.order_id, SUM(p.price * oi.qty) AS total
  FROM orders o
  JOIN order_items oi ON oi.order_id = o.order_id
  JOIN products p ON p.product_id = oi.product_id
  GROUP BY o.order_id
)
WHERE total > (SELECT AVG(total) FROM (
  SELECT SUM(p.price * oi.qty) AS total
  FROM orders o
  JOIN order_items oi ON oi.order_id = o.order_id
  JOIN products p ON p.product_id = oi.product_id
  GROUP BY o.order_id
));

-- 5. Продукты без норм
SELECT p.code, p.name
FROM products p
LEFT JOIN norms n ON n.product_id = p.product_id
WHERE n.product_id IS NULL;
