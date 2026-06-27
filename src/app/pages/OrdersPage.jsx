import { useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useI18n } from "../../i18n/I18nContext.jsx";
import { CustomerOrderHistory } from "../orders/CustomerOrderHistory.jsx";
import { OrderTicket } from "../orders/OrderTicket.jsx";
import { Icon } from "../ui/Icon.jsx";

const HANDLED_PREVIEW_LIMIT = 16;

function StaffMode({ orders, onStatusChange, onReady }) {
  const { t } = useI18n();
  const [handledExpanded, setHandledExpanded] = useState(false);
  const pending = orders.filter((order) => order.status === "new");
  const handled = useMemo(
    () =>
      orders
        .filter((order) => order.status !== "new")
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [orders],
  );
  const hasMoreHandled = handled.length > HANDLED_PREVIEW_LIMIT;
  const visibleHandled =
    handledExpanded || !hasMoreHandled ? handled : handled.slice(0, HANDLED_PREVIEW_LIMIT);

  return (
    <section className="content-section page-section" aria-labelledby="staff-title">
      <div className="section-heading">
        <p className="eyebrow">{t("staff.eyebrow")}</p>
        <h2 id="staff-title">{t("staff.title")}</h2>
        <p>{t("staff.body")}</p>
      </div>

      <div className="staff-layout">
        <div>
          <h3 className="panel-title">{t("staff.waitingTitle")}</h3>
          <div className="ticket-list ticket-list--staff-grid">
            {pending.length ? (
              pending.map((order) => (
                <OrderTicket key={order.id} order={order} hideReadyState>
                  <button className="accept-button" type="button" onClick={() => onStatusChange(order.id, "accepted")}>
                    <Icon name="check" />
                    {t("staff.accept")}
                  </button>
                  <button className="decline-button" type="button" onClick={() => onStatusChange(order.id, "declined")}>
                    <Icon name="x" />
                    {t("staff.decline")}
                  </button>
                </OrderTicket>
              ))
            ) : (
              <div className="empty-state empty-state--soft staff-empty">
                <p className="empty-state-title">{t("staff.emptyPendingTitle")}</p>
                <p className="empty-state-hint">{t("staff.emptyPendingHint")}</p>
              </div>
            )}
          </div>
        </div>
        <div>
          <h3 className="panel-title">{t("staff.handledTitle")}</h3>
          <div className="ticket-list ticket-list--staff-grid">
            {handled.length ? (
              visibleHandled.map((order) => (
                <OrderTicket
                  key={order.id}
                  order={order}
                  onReady={order.status === "accepted" && !order.ready ? onReady : undefined}
                />
              ))
            ) : (
              <div className="empty-state empty-state--soft staff-empty">
                <p className="empty-state-title">{t("staff.emptyHandledTitle")}</p>
                <p className="empty-state-hint">{t("staff.emptyHandledHint")}</p>
              </div>
            )}
          </div>
          {hasMoreHandled ? (
            <button
              type="button"
              className="secondary-cta small staff-handled-toggle"
              aria-expanded={handledExpanded}
              onClick={() => setHandledExpanded((open) => !open)}
            >
              <Icon name={handledExpanded ? "chevronUp" : "chevronDown"} />
              {handledExpanded
                ? t("staff.collapseHandled", { limit: HANDLED_PREVIEW_LIMIT })
                : t("staff.expandHandled", { count: handled.length })}
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export function OrdersPage({ mode, session, orders, onStatusChange, onReady }) {
  const { t } = useI18n();
  if (session?.role === "staff" || session?.role === "owner") {
    return <StaffMode orders={orders} onStatusChange={onStatusChange} onReady={onReady} />;
  }
  if (mode === "staff") {
    return <Navigate to="/login?role=staff" replace />;
  }

  if (!session) {
    return (
      <section className="content-section page-section" aria-labelledby="orders-title">
        <div className="section-heading">
          <p className="eyebrow">{t("ordersPage.eyebrow")}</p>
          <h2 id="orders-title">{t("ordersPage.guestTitle")}</h2>
          <p>{t("ordersPage.guestBody")}</p>
        </div>
        <div className="profile-auth-actions profile-auth-actions--centered">
          <Link className="primary-cta" to="/login">
            {t("profile.login")}
          </Link>
          <Link className="secondary-cta" to="/register">
            {t("profile.register")}
          </Link>
        </div>
        <div className="empty-state empty-state--soft profile-empty-panel">
          <p className="empty-state-hint">{t("ordersPage.guestHint")}</p>
          <Link className="primary-cta" to="/menu">
            {t("profile.goMenu")}
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="content-section page-section" aria-labelledby="orders-title">
      <div className="section-heading">
        <p className="eyebrow">{t("ordersPage.eyebrow")}</p>
        <h2 id="orders-title">{t("ordersPage.historyTitle")}</h2>
        <p>{t("ordersPage.historyBody")}</p>
      </div>
      <CustomerOrderHistory session={session} orders={orders} />
    </section>
  );
}
