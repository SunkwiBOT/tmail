package api

import (
	"context"
	"net/http"
	"strconv"
	"time"
	"tmail/ent"
	"tmail/ent/attachment"
	"tmail/ent/envelope"
	"tmail/ent/predicate"

	"github.com/sunls24/gox"
	"github.com/sunls24/gox/notifier"
	"github.com/sunls24/gox/server"
)

const subAll = "all"

const fetchPageSize = 10

type ReqFetch struct {
	To    string `query:"to"`
	Since string `query:"since"`
}

func Fetch(ctx context.Context, req ReqFetch) ([]*ent.Envelope, error) {
	if req.To == "" {
		return nil, server.BadParam()
	}
	admin := req.To == Config(ctx).AdminAddress
	since := time.Time{}
	if !admin {
		if req.Since != "" {
			ts, err := strconv.ParseInt(req.Since, 10, 64)
			if err == nil && ts >= 0 {
				since = time.Unix(ts, 0)
			}
		}
	}
	query := DB(ctx).Envelope.Query().
		Select(envelope.FieldID, envelope.FieldTo, envelope.FieldFrom, envelope.FieldSubject, envelope.FieldCreatedAt).
		Order(ent.Desc(envelope.FieldID))
	if !admin {
		wheres := []predicate.Envelope{envelope.To(req.To)}
		if !since.IsZero() {
			wheres = append(wheres, envelope.CreatedAtGTE(since))
		}
		query.Where(wheres...)
	} else {
		query.Limit(100)
	}
	list, err := query.All(ctx)
	if err != nil {
		return nil, err
	}
	return list, nil
}

type ReqFetchPage struct {
	To   string `query:"to"`
	Page int    `query:"page"`
}

type FetchPagination struct {
	Page       int `json:"page"`
	Total      int `json:"total"`
	TotalPages int `json:"total_pages"`
}

type FetchPageResp struct {
	Envelopes  []*ent.Envelope `json:"envelopes"`
	Pagination FetchPagination `json:"pagination"`
}

func FetchPage(ctx context.Context, req ReqFetchPage) (*FetchPageResp, error) {
	if req.To == "" || req.Page < 0 {
		return nil, server.BadParam()
	}

	page := req.Page
	if page == 0 {
		page = 1
	}

	admin := req.To == Config(ctx).AdminAddress
	countQuery := DB(ctx).Envelope.Query()
	if !admin {
		countQuery.Where(envelope.To(req.To))
	}
	total, err := countQuery.Count(ctx)
	if err != nil {
		return nil, err
	}

	totalPages := max(1, (total+fetchPageSize-1)/fetchPageSize)
	page = min(page, totalPages)

	query := DB(ctx).Envelope.Query().
		Select(envelope.FieldID, envelope.FieldTo, envelope.FieldFrom, envelope.FieldSubject, envelope.FieldCreatedAt).
		Order(ent.Desc(envelope.FieldID)).
		Offset((page - 1) * fetchPageSize).
		Limit(fetchPageSize)
	if !admin {
		query.Where(envelope.To(req.To))
	}

	list, err := query.All(ctx)
	if err != nil {
		return nil, err
	}

	return &FetchPageResp{
		Envelopes: list,
		Pagination: FetchPagination{
			Page:       page,
			Total:      total,
			TotalPages: totalPages,
		},
	}, nil
}

type MailDetail struct {
	Content     string             `json:"content"`
	Attachments []AttachmentDetail `json:"attachments"`
}

type AttachmentDetail struct {
	ID       string `json:"id"`
	Filename string `json:"filename"`
}

type ReqFetchDetail struct {
	ID int `param:"id"`
}

func FetchDetail(ctx context.Context, req ReqFetchDetail) (*MailDetail, error) {
	e, err := DB(ctx).Envelope.Query().
		Select(envelope.FieldContent).
		Where(envelope.ID(req.ID)).
		Only(ctx)
	if ent.IsNotFound(err) {
		return nil, server.ErrMsgf("envelope %d not found", req.ID)
	}
	if err != nil {
		return nil, err
	}
	dbAttachments, err := e.QueryAttachments().All(ctx)
	if err != nil {
		return nil, err
	}
	attachments := gox.Map(dbAttachments, func(a *ent.Attachment) AttachmentDetail {
		return AttachmentDetail{
			ID:       a.ID,
			Filename: a.Filename,
		}
	})

	return &MailDetail{
		Content:     e.Content,
		Attachments: attachments,
	}, nil
}

type ReqFetchLatest struct {
	To string `query:"to"`
	ID string `query:"id"`
}

func FetchLatest(ctx context.Context, req ReqFetchLatest) (*server.Reply, error) {
	if req.To == "" {
		return nil, server.BadParam()
	}
	to := req.To
	admin := to == Config(ctx).AdminAddress
	if !admin {
		id, err := strconv.Atoi(req.ID)
		if err != nil {
			return nil, server.BadParam()
		}
		e, err := DB(ctx).Envelope.Query().
			Select(envelope.FieldID, envelope.FieldTo, envelope.FieldFrom, envelope.FieldSubject, envelope.FieldCreatedAt).
			Where(envelope.IDGT(id), envelope.To(to)).
			Order(ent.Asc(envelope.FieldID)).
			First(ctx)
		if err == nil {
			return server.OK(e), nil
		}
		if !ent.IsNotFound(err) {
			return nil, err
		}
	} else {
		to = subAll
	}

	ch, cancel := notifier.Wait(to)
	defer cancel()
	select {
	case v := <-ch:
		return server.OK(v), nil
	case <-time.After(time.Minute):
		return server.StatusCode(http.StatusNoContent), nil
	case <-ctx.Done():
		return server.Handled(), nil
	}
}

type ReqDownload struct {
	ID string `param:"id"`
}

func Download(ctx context.Context, req ReqDownload) (*server.Reply, error) {
	if req.ID == "" {
		return nil, server.BadParam()
	}

	a, err := DB(ctx).Attachment.Query().Where(attachment.ID(req.ID)).First(ctx)
	if err != nil {
		return nil, err
	}

	ec := server.EchoContext(ctx)
	if err = ec.Attachment(a.Filepath, a.Filename); err != nil {
		return nil, err
	}

	return server.Handled(), nil
}
