-- ============================================================
-- Automation Wizard RPC Functions
-- Bu migration wizard UI'dan otomasyon deploy etmek icin
-- gerekli RPC fonksiyonlarini olusturur.
-- ============================================================

-- 1. Tablo sutun bilgisi sorgulama
CREATE OR REPLACE FUNCTION get_manuf_table_columns(p_table_name TEXT DEFAULT NULL)
RETURNS TABLE(table_name TEXT, column_name TEXT, data_type TEXT, is_nullable TEXT)
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT
    c.table_name::TEXT,
    c.column_name::TEXT,
    c.data_type::TEXT,
    c.is_nullable::TEXT
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name LIKE 'manuf_%'
    AND (p_table_name IS NULL OR c.table_name = p_table_name)
  ORDER BY c.table_name, c.ordinal_position;
$$;

-- 2. Otomasyon deploy fonksiyonu
CREATE OR REPLACE FUNCTION deploy_automation_sql(
  p_automation_id TEXT,
  p_type TEXT,
  p_source_table TEXT,
  p_selected_columns TEXT[],
  p_trigger_events TEXT[],
  p_cron_schedule TEXT,
  p_date_filter_column TEXT,
  p_date_filter_range TEXT,
  p_aggregation TEXT,
  p_aggregation_column TEXT,
  p_payload_format TEXT,
  p_card_title TEXT,
  p_card_color TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _func_name TEXT;
  _trigger_name TEXT;
  _columns_sql TEXT;
  _date_filter TEXT := '';
  _payload_sql TEXT;
  _func_sql TEXT;
  _col TEXT;
  _facts_arr TEXT := '';
  _col_idx INT := 0;
BEGIN
  -- Sadece manuf_ tablolarina izin ver
  IF p_source_table NOT LIKE 'manuf_%' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sadece manuf_ tablolari desteklenir');
  END IF;

  -- Tablo varligini kontrol et
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = p_source_table
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tablo bulunamadi: ' || p_source_table);
  END IF;

  -- Sutun varligini kontrol et
  FOREACH _col IN ARRAY p_selected_columns LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = p_source_table AND column_name = _col
    ) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Sutun bulunamadi: ' || _col || ' (' || p_source_table || ')');
    END IF;
  END LOOP;

  _func_name := 'auto_' || p_automation_id || '_func';
  _trigger_name := 'auto_' || p_automation_id || '_trigger';

  -- Sutun listesi olustur
  SELECT string_agg(quote_ident(c), ', ')
  INTO _columns_sql
  FROM unnest(p_selected_columns) AS c;

  -- Tarih filtresi (cron icin)
  IF p_type = 'cron' AND p_date_filter_column IS NOT NULL AND p_date_filter_column <> '' THEN
    -- Filtre sutununun varligini kontrol et
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = p_source_table AND column_name = p_date_filter_column
    ) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Filtre sutunu bulunamadi: ' || p_date_filter_column);
    END IF;

    CASE p_date_filter_range
      WHEN 'today' THEN
        _date_filter := format(' WHERE %I >= CURRENT_DATE', p_date_filter_column);
      WHEN 'yesterday' THEN
        _date_filter := format(' WHERE %I >= CURRENT_DATE - 1 AND %I < CURRENT_DATE', p_date_filter_column, p_date_filter_column);
      WHEN 'last_7_days' THEN
        _date_filter := format(' WHERE %I >= CURRENT_DATE - 7', p_date_filter_column);
      WHEN 'last_30_days' THEN
        _date_filter := format(' WHERE %I >= CURRENT_DATE - 30', p_date_filter_column);
      ELSE
        _date_filter := '';
    END CASE;
  END IF;

  -- Payload olusturma SQL'i
  IF p_payload_format = 'teams_adaptive_card' THEN
    -- Teams Adaptive Card formatinda FactSet olustur
    _col_idx := 0;
    FOREACH _col IN ARRAY p_selected_columns LOOP
      IF _col_idx > 0 THEN
        _facts_arr := _facts_arr || ', ';
      END IF;

      IF p_type = 'trigger' THEN
        _facts_arr := _facts_arr || format(
          'jsonb_build_object(''title'', %L, ''value'', coalesce(NEW.%I::text, ''-''))',
          _col, _col
        );
      ELSE
        _facts_arr := _facts_arr || format(
          'jsonb_build_object(''title'', %L, ''value'', coalesce(r.%I::text, ''-''))',
          _col, _col
        );
      END IF;
      _col_idx := _col_idx + 1;
    END LOOP;

    IF p_type = 'trigger' THEN
      _payload_sql := format(
        '_payload := jsonb_build_object(
          ''type'', ''message'',
          ''attachments'', jsonb_build_array(
            jsonb_build_object(
              ''contentType'', ''application/vnd.microsoft.card.adaptive'',
              ''content'', jsonb_build_object(
                ''type'', ''AdaptiveCard'',
                ''$schema'', ''http://adaptivecards.io/schemas/adaptive-card.json'',
                ''version'', ''1.4'',
                ''body'', jsonb_build_array(
                  jsonb_build_object(''type'', ''TextBlock'', ''text'', %L, ''weight'', ''Bolder'', ''size'', ''Medium'', ''color'', %L),
                  jsonb_build_object(''type'', ''FactSet'', ''facts'', jsonb_build_array(%s))
                )
              )
            )
          )
        );',
        p_card_title, COALESCE(p_card_color, 'Default'), _facts_arr
      );
    ELSE
      -- Cron icin: _rows zaten var, FactSet satirlari icin loop kullan
      _payload_sql := format(
        'SELECT jsonb_build_object(
          ''type'', ''message'',
          ''attachments'', jsonb_build_array(
            jsonb_build_object(
              ''contentType'', ''application/vnd.microsoft.card.adaptive'',
              ''content'', jsonb_build_object(
                ''type'', ''AdaptiveCard'',
                ''$schema'', ''http://adaptivecards.io/schemas/adaptive-card.json'',
                ''version'', ''1.4'',
                ''body'', jsonb_build_array(
                  jsonb_build_object(''type'', ''TextBlock'', ''text'', %L, ''weight'', ''Bolder'', ''size'', ''Medium'', ''color'', %L),
                  jsonb_build_object(''type'', ''TextBlock'', ''text'', ''Kayit sayisi: '' || coalesce(jsonb_array_length(_rows), 0)::text, ''isSubtle'', true, ''spacing'', ''None''),
                  jsonb_build_object(''type'', ''TextBlock'', ''text'', coalesce(_rows::text, ''[]''), ''wrap'', true, ''size'', ''Small'')
                )
              )
            )
          )
        ) INTO _payload;',
        p_card_title, COALESCE(p_card_color, 'Default')
      );
    END IF;
  ELSE
    -- Plain JSON format
    IF p_type = 'trigger' THEN
      _payload_sql := '_payload := jsonb_build_object(' ||
        '''automation_id'', ' || quote_literal(p_automation_id) || ', ' ||
        '''event'', TG_OP, ' ||
        '''timestamp'', now()::text';
      FOREACH _col IN ARRAY p_selected_columns LOOP
        _payload_sql := _payload_sql || format(', %L, NEW.%I', _col, _col);
      END LOOP;
      _payload_sql := _payload_sql || ');';
    ELSE
      _payload_sql := format(
        '_payload := jsonb_build_object(
          ''automation_id'', %L,
          ''timestamp'', now()::text,
          ''row_count'', coalesce(jsonb_array_length(_rows), 0),
          ''data'', coalesce(_rows, ''[]''::jsonb)
        );',
        p_automation_id
      );
    END IF;
  END IF;

  -- Fonksiyonu olustur ve deploy et
  IF p_type = 'cron' THEN
    _func_sql := format(
      'CREATE OR REPLACE FUNCTION %I() RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $fn$
       DECLARE
         _webhook_url TEXT;
         _payload JSONB;
         _rows JSONB;
       BEGIN
         SELECT webhook_url INTO _webhook_url FROM manuf_automations WHERE id = %L AND is_active = true;
         IF _webhook_url IS NULL OR _webhook_url = '''' THEN RETURN; END IF;

         SELECT jsonb_agg(row_to_json(t)) INTO _rows FROM (SELECT %s FROM %I%s) t;
         IF _rows IS NULL THEN _rows := ''[]''::jsonb; END IF;

         %s

         PERFORM net.http_post(
           url := _webhook_url,
           body := _payload,
           headers := ''{"Content-Type": "application/json"}''::jsonb
         );
       END; $fn$;',
      _func_name,
      p_automation_id,
      _columns_sql,
      p_source_table,
      _date_filter,
      _payload_sql
    );

    EXECUTE _func_sql;

    -- Mevcut cron job varsa kaldir
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = p_automation_id) THEN
      PERFORM cron.unschedule(p_automation_id);
    END IF;

    -- Yeni cron job olustur
    PERFORM cron.schedule(
      p_automation_id,
      p_cron_schedule,
      format('SELECT %I()', _func_name)
    );

  ELSIF p_type = 'trigger' THEN
    _func_sql := format(
      'CREATE OR REPLACE FUNCTION %I() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $fn$
       DECLARE
         _webhook_url TEXT;
         _payload JSONB;
       BEGIN
         SELECT webhook_url INTO _webhook_url FROM manuf_automations WHERE id = %L AND is_active = true;
         IF _webhook_url IS NULL OR _webhook_url = '''' THEN RETURN NEW; END IF;

         %s

         PERFORM net.http_post(
           url := _webhook_url,
           body := _payload,
           headers := ''{"Content-Type": "application/json"}''::jsonb
         );
         RETURN NEW;
       END; $fn$;',
      _func_name,
      p_automation_id,
      _payload_sql
    );

    EXECUTE _func_sql;

    -- Trigger olustur
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I', _trigger_name, p_source_table);
    EXECUTE format(
      'CREATE TRIGGER %I AFTER %s ON %I FOR EACH ROW EXECUTE FUNCTION %I()',
      _trigger_name,
      array_to_string(p_trigger_events, ' OR '),
      p_source_table,
      _func_name
    );
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Gecersiz tip: ' || p_type);
  END IF;

  RETURN jsonb_build_object('success', true, 'function_name', _func_name);
END;
$$;

-- 3. Otomasyon kaldirma fonksiyonu
CREATE OR REPLACE FUNCTION undeploy_automation_sql(p_automation_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _func_name TEXT := 'auto_' || p_automation_id || '_func';
  _trigger_name TEXT := 'auto_' || p_automation_id || '_trigger';
  _auto RECORD;
  _source_table TEXT;
BEGIN
  SELECT * INTO _auto FROM manuf_automations WHERE id = p_automation_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', true);
  END IF;

  -- Cron job kaldir
  IF _auto.type = 'cron' THEN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = p_automation_id) THEN
      PERFORM cron.unschedule(p_automation_id);
    END IF;
  END IF;

  -- Trigger kaldir
  IF _auto.type = 'trigger' AND _auto.source_event IS NOT NULL THEN
    _source_table := split_part(_auto.source_event, ' ', 1);
    IF _source_table LIKE 'manuf_%' THEN
      EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I', _trigger_name, _source_table);
    END IF;
  END IF;

  -- Fonksiyonu kaldir
  BEGIN
    EXECUTE format('DROP FUNCTION IF EXISTS %I() CASCADE', _func_name);
  EXCEPTION WHEN OTHERS THEN
    -- Fonksiyon zaten yoksa sorun degil
    NULL;
  END;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Anon role icin EXECUTE izni ver
GRANT EXECUTE ON FUNCTION get_manuf_table_columns(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION deploy_automation_sql(TEXT, TEXT, TEXT, TEXT[], TEXT[], TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION undeploy_automation_sql(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_manuf_table_columns(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION deploy_automation_sql(TEXT, TEXT, TEXT, TEXT[], TEXT[], TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION undeploy_automation_sql(TEXT) TO authenticated;
