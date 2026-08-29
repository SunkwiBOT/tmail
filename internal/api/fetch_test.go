package api

import (
	"context"
	"fmt"
	"testing"
	"tmail/config"
	"tmail/ent/enttest"

	_ "github.com/mattn/go-sqlite3"
)

func TestFetchPage(t *testing.T) {
	db := enttest.Open(t, "sqlite3", "file:fetch_page?mode=memory&cache=shared&_fk=1")
	t.Cleanup(func() { _ = db.Close() })

	ctx := context.WithValue(context.Background(), dbKey{}, db)
	ctx = context.WithValue(ctx, configKey{}, &config.Config{AdminAddress: "admin@example.com"})

	for i := 1; i <= 25; i++ {
		db.Envelope.Create().
			SetTo("inbox@example.com").
			SetFrom("sender@example.com").
			SetSubject(fmt.Sprintf("Message %d", i)).
			SaveX(ctx)
	}
	for i := 1; i <= 3; i++ {
		db.Envelope.Create().
			SetTo("other@example.com").
			SetFrom("sender@example.com").
			SetSubject(fmt.Sprintf("Other %d", i)).
			SaveX(ctx)
	}

	t.Run("normal mailbox", func(t *testing.T) {
		result, err := FetchPage(ctx, ReqFetchPage{To: "inbox@example.com", Page: 2})
		if err != nil {
			t.Fatal(err)
		}
		if result.Pagination != (FetchPagination{Page: 2, Total: 25, TotalPages: 3}) {
			t.Fatalf("unexpected pagination: %+v", result.Pagination)
		}
		if len(result.Envelopes) != fetchPageSize {
			t.Fatalf("got %d envelopes, want %d", len(result.Envelopes), fetchPageSize)
		}
		if result.Envelopes[0].ID != 15 || result.Envelopes[9].ID != 6 {
			t.Fatalf("unexpected IDs on page 2: %d ... %d", result.Envelopes[0].ID, result.Envelopes[9].ID)
		}
	})

	t.Run("page above last page", func(t *testing.T) {
		result, err := FetchPage(ctx, ReqFetchPage{To: "inbox@example.com", Page: 99})
		if err != nil {
			t.Fatal(err)
		}
		if result.Pagination.Page != 3 || len(result.Envelopes) != 5 {
			t.Fatalf("unexpected last page: pagination=%+v envelopes=%d", result.Pagination, len(result.Envelopes))
		}
	})

	t.Run("admin mailbox", func(t *testing.T) {
		result, err := FetchPage(ctx, ReqFetchPage{To: "admin@example.com", Page: 1})
		if err != nil {
			t.Fatal(err)
		}
		if result.Pagination.Total != 28 || result.Pagination.TotalPages != 3 {
			t.Fatalf("unexpected admin pagination: %+v", result.Pagination)
		}
		if len(result.Envelopes) != fetchPageSize || result.Envelopes[0].ID != 28 {
			t.Fatalf("unexpected admin page: count=%d first=%d", len(result.Envelopes), result.Envelopes[0].ID)
		}
	})
}
