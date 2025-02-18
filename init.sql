DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "user" WHERE username = '${ADMIN_USERNAME}') THEN
    INSERT INTO "user" (username, password)
    VALUES ('${ADMIN_USERNAME}', '${ADMIN_PASSWORD}');
  END IF;
END $$;
