CREATE SCHEMA "private";

REVOKE ALL ON SCHEMA "private" FROM PUBLIC, "anon";

REVOKE CREATE ON SCHEMA "private" FROM "authenticated", "service_role";

GRANT USAGE ON SCHEMA "private" TO "authenticated";

GRANT CREATE, USAGE ON SCHEMA "private" TO "postgres";

GRANT USAGE ON SCHEMA "private" TO "service_role";
