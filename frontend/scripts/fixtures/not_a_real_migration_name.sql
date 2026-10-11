-- cutoff self-test: a filename with NO 14-digit timestamp prefix at all.
-- Must be classified "unparseable" and cause a hard build failure on
-- its own, regardless of the SQL content below (which is deliberately
-- harmless, to prove the failure is about the NAME, not the content).
select 1;
