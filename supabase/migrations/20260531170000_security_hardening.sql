-- Security hardening for public browser traffic.
-- Apply after the initial schema / grants migrations.

-- ---------------------------------------------------------------------------
-- Orders: enforce quantity bounds in the database, not only in the browser.
-- ---------------------------------------------------------------------------
UPDATE public.orders SET quantity = 1 WHERE quantity < 1;
UPDATE public.orders SET quantity = 50 WHERE quantity > 50;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.orders'::regclass
      AND conname = 'orders_quantity_bounds'
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_quantity_bounds CHECK (quantity BETWEEN 1 AND 50);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.enforce_order_insert_safety()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  recent_quantity integer;
BEGIN
  IF NEW.quantity IS NULL OR NEW.quantity < 1 OR NEW.quantity > 50 THEN
    RAISE EXCEPTION 'Order quantity must be between 1 and 50'
      USING ERRCODE = '23514';
  END IF;

  -- Do not trust client-supplied timestamps for burst checks.
  NEW.created_at := now();

  SELECT COALESCE(sum(o.quantity), 0)::integer
    INTO recent_quantity
  FROM public.orders o
  WHERE o.placed_by_id = NEW.placed_by_id
    AND o.created_at >= now() - interval '30 seconds';

  IF recent_quantity + NEW.quantity > 50 THEN
    RAISE EXCEPTION 'Order rate limit exceeded'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_safety_before_insert ON public.orders;
CREATE TRIGGER orders_safety_before_insert
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.enforce_order_insert_safety();

-- ---------------------------------------------------------------------------
-- Reviews: one review per signed-in user per dish, text limits, and rate limit.
-- ---------------------------------------------------------------------------
WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY menu_item_id, author_id
      ORDER BY created_at DESC, id DESC
    ) AS rn
  FROM public.reviews
  WHERE author_id IS NOT NULL
)
DELETE FROM public.reviews r
USING ranked d
WHERE r.id = d.id
  AND d.rn > 1;

UPDATE public.reviews
SET
  body = left(btrim(regexp_replace(COALESCE(body, ''), '[[:cntrl:]]+', ' ', 'g')), 500),
  author_display = COALESCE(NULLIF(left(btrim(regexp_replace(COALESCE(author_display, ''), '[[:cntrl:]]+', ' ', 'g')), 80), ''), 'Guest');

DELETE FROM public.reviews
WHERE char_length(btrim(body)) < 3;

CREATE UNIQUE INDEX IF NOT EXISTS reviews_one_per_user_item_idx
  ON public.reviews (menu_item_id, author_id)
  WHERE author_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS reviews_author_recent_idx
  ON public.reviews (author_id, created_at DESC)
  WHERE author_id IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.reviews'::regclass
      AND conname = 'reviews_body_length_bounds'
  ) THEN
    ALTER TABLE public.reviews
      ADD CONSTRAINT reviews_body_length_bounds
      CHECK (char_length(btrim(body)) BETWEEN 3 AND 500);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.enforce_review_write_safety()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  recent_review_count integer;
BEGIN
  IF NEW.author_id IS NULL THEN
    RAISE EXCEPTION 'Reviews require a signed-in user'
      USING ERRCODE = '23514';
  END IF;

  NEW.body := left(btrim(regexp_replace(COALESCE(NEW.body, ''), '[[:cntrl:]]+', ' ', 'g')), 500);
  NEW.author_display := COALESCE(
    NULLIF(left(btrim(regexp_replace(COALESCE(NEW.author_display, ''), '[[:cntrl:]]+', ' ', 'g')), 80), ''),
    'Guest'
  );

  IF char_length(NEW.body) < 3 THEN
    RAISE EXCEPTION 'Review text is too short'
      USING ERRCODE = '23514';
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.created_at := now();

    SELECT count(*)::integer
      INTO recent_review_count
    FROM public.reviews r
    WHERE r.author_id = NEW.author_id
      AND r.created_at >= now() - interval '10 minutes';

    IF recent_review_count >= 5 THEN
      RAISE EXCEPTION 'Review rate limit exceeded'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reviews_safety_before_write ON public.reviews;
CREATE TRIGGER reviews_safety_before_write
  BEFORE INSERT OR UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.enforce_review_write_safety();
