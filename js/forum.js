/**
 * ForumStore is the only data seam.
 * Replace these three methods with API calls when a server exists.
 * They already return promises.
 *
 * Thread: { id, title, body, displayName, createdAt, replies }
 * Reply:  { id, body, displayName, createdAt }
 * createdAt is an ISO-8601 UTC string.
 * displayName is a label. A blank name is stored as "Anonymous".
 */
(function () {
  var STORAGE_KEY = "austin-dog-mushing-forum-v1";
  var ANON = "Anonymous";
  var LIMITS = { name: 40, title: 140, body: 4000 };

  var SEED = [
    {
      id: "seed-paths",
      title: "Early paths with some shade",
      body: "Mornings are the easier time to mush in Austin. Which paved or packed paths stay quiet, and which ones keep some shade as the season warms?",
      displayName: ANON,
      createdAt: "2026-11-12T15:00:00.000Z",
      replies: [
        {
          id: "seed-paths-r1",
          body: "Wider trails with room to step aside tend to work well early. A short line helps when people are ahead.",
          displayName: ANON,
          createdAt: "2026-11-13T17:00:00.000Z"
        }
      ]
    },
    {
      id: "seed-lights",
      title: "Being seen after dark",
      body: "Evening runs are part of the routine. How do people keep the dogs, the lines, and the scooter visible?",
      displayName: ANON,
      createdAt: "2026-11-16T14:00:00.000Z",
      replies: [
        {
          id: "seed-lights-r1",
          body: "Reflective harnesses, a light on the scooter, and a small light near the line make the team easier to see at crossings.",
          displayName: ANON,
          createdAt: "2026-11-16T18:00:00.000Z"
        },
        {
          id: "seed-lights-r2",
          body: "A steady pace and an early stop matter as much as the lights. Cooler air is a kindness, and so is ending before anyone is tired.",
          displayName: ANON,
          createdAt: "2026-11-17T23:00:00.000Z"
        }
      ]
    },
    {
      id: "seed-scooter",
      title: "A calm start on the scooter",
      body: "Pulling on foot is comfortable. What is a calm order for introducing an electric kick scooter?",
      displayName: ANON,
      createdAt: "2026-11-19T15:00:00.000Z",
      replies: [
        {
          id: "seed-scooter-r1",
          body: "A straight, quiet path is a good first place. Practice the stop before any speed, keep the motor gentle, and end while the dog is still glad to work.",
          displayName: ANON,
          createdAt: "2026-11-20T16:30:00.000Z"
        }
      ]
    }
  ];

  var memory = null;
  var persist = true;

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function newId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }
    return "id-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
  }

  function isReply(value) {
    return Boolean(
      value &&
      typeof value.id === "string" &&
      typeof value.body === "string" &&
      typeof value.displayName === "string" &&
      typeof value.createdAt === "string"
    );
  }

  function isThread(value) {
    return Boolean(
      value &&
      typeof value.id === "string" &&
      typeof value.title === "string" &&
      typeof value.body === "string" &&
      typeof value.displayName === "string" &&
      typeof value.createdAt === "string" &&
      Array.isArray(value.replies) &&
      value.replies.every(isReply)
    );
  }

  function labelOf(name) {
    var clean = String(name || "").replace(/\s+/g, " ").trim().slice(0, LIMITS.name);
    return clean || ANON;
  }

  function cleanInput(input, titleRequired) {
    var title = String((input && input.title) || "").trim().slice(0, LIMITS.title);
    var body = String((input && input.body) || "").trim().slice(0, LIMITS.body);
    if (titleRequired && !title) {
      throw new Error("Add a title.");
    }
    if (!body) {
      throw new Error("Add a note.");
    }
    return {
      displayName: labelOf(input && input.displayName),
      title: title,
      body: body
    };
  }

  function lastActivity(thread) {
    var latest = thread.createdAt;
    thread.replies.forEach(function (reply) {
      if (reply.createdAt > latest) latest = reply.createdAt;
    });
    return latest;
  }

  function sorted(threads) {
    return threads.slice().sort(function (a, b) {
      var left = lastActivity(a);
      var right = lastActivity(b);
      if (left === right) return 0;
      return left < right ? 1 : -1;
    });
  }

  function write(threads) {
    memory = threads;
    if (!persist) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(threads));
    } catch (err) {
      persist = false;
    }
  }

  function read() {
    if (memory) return memory;
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        memory = clone(SEED);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(memory));
        return memory;
      }
      var parsed = JSON.parse(raw);
      var threads = Array.isArray(parsed) ? parsed.filter(isThread) : [];
      if (!threads.length) {
        memory = clone(SEED);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(memory));
        return memory;
      }
      memory = threads;
      return memory;
    } catch (err) {
      persist = false;
      memory = memory || clone(SEED);
      return memory;
    }
  }

  var ForumStore = {
    async listThreads() {
      return clone(sorted(read()));
    },
    async createThread(input) {
      var clean = cleanInput(input, true);
      var thread = {
        id: newId(),
        title: clean.title,
        body: clean.body,
        displayName: clean.displayName,
        createdAt: new Date().toISOString(),
        replies: []
      };
      var threads = read().slice();
      threads.push(thread);
      write(threads);
      return clone(thread);
    },
    async createReply(threadId, input) {
      var clean = cleanInput(input, false);
      var threads = read().slice();
      var index = threads.findIndex(function (thread) {
        return thread.id === threadId;
      });
      if (index === -1) {
        throw new Error("That note is no longer in this browser.");
      }
      var reply = {
        id: newId(),
        body: clean.body,
        displayName: clean.displayName,
        createdAt: new Date().toISOString()
      };
      var thread = clone(threads[index]);
      thread.replies = thread.replies.concat([reply]);
      threads[index] = thread;
      write(threads);
      return clone(reply);
    },
    savesInBrowser: function () {
      read();
      return persist;
    }
  };

  window.ForumStore = ForumStore;

  var dateFormat = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    month: "long",
    day: "numeric",
    year: "numeric"
  });

  function formatDate(iso) {
    var date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "";
    return dateFormat.format(date);
  }

  function replyCountLabel(count) {
    if (count === 0) return "No replies yet";
    if (count === 1) return "1 reply";
    return count + " replies";
  }

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (key) {
      var value = attrs[key];
      if (value == null || value === false) return;
      if (key === "class") node.className = value;
      else node.setAttribute(key, value === true ? "" : String(value));
    });
    var list = Array.isArray(children) ? children : children == null ? [] : [children];
    list.forEach(function (child) {
      node.append(child instanceof Node ? child : document.createTextNode(String(child)));
    });
    return node;
  }

  function metaLine(name, iso) {
    var line = el("p", { class: "meta" });
    line.append(el("span", { class: "author" }, name));
    line.append(document.createTextNode(" · "));
    line.append(el("time", { datetime: iso }, formatDate(iso)));
    return line;
  }

  function setStatus(message) {
    var status = document.getElementById("forum-status");
    if (status) status.textContent = message || "";
  }

  function showError(input, message) {
    var errorId = input.getAttribute("aria-describedby");
    var error = errorId ? document.getElementById(errorId) : null;
    if (!error) return;
    if (message) {
      input.setAttribute("aria-invalid", "true");
      error.hidden = false;
      error.textContent = message;
    } else {
      input.removeAttribute("aria-invalid");
      error.hidden = true;
      error.textContent = "";
    }
  }

  function clearFormErrors(form) {
    Array.prototype.forEach.call(form.elements, function (field) {
      if (field && field.matches && field.matches("input, textarea")) showError(field, "");
    });
  }

  function fieldErrors(fields, titleRequired) {
    var errors = {};
    if (titleRequired && !String(fields.title || "").trim()) errors.title = "Add a title.";
    if (!String(fields.body || "").trim()) errors.body = "Add a note.";
    return errors;
  }

  function domId(value) {
    return String(value).replace(/[^A-Za-z0-9_-]/g, "");
  }

  function renderThread(thread, freshId) {
    var safeId = domId(thread.id);
    var article = el("article", {
      class: "thread" + (thread.id === freshId ? " is-fresh" : ""),
      id: "thread-" + safeId
    });
    var heading = el("h3", { id: "thread-title-" + safeId, tabindex: "-1" }, thread.title);
    article.append(
      heading,
      metaLine(thread.displayName, thread.createdAt),
      el("div", { class: "post-body" }, thread.body),
      el("p", { class: "reply-count" }, replyCountLabel(thread.replies.length))
    );

    if (thread.replies.length) {
      var list = el("div", { class: "replies" });
      thread.replies.forEach(function (reply) {
        var block = el("div", { class: "reply", id: "reply-" + domId(reply.id) });
        block.append(metaLine(reply.displayName, reply.createdAt), el("div", { class: "post-body" }, reply.body));
        list.append(block);
      });
      article.append(list);
    }

    var formId = "reply-form-" + safeId;
    var toggle = el("button", {
      class: "button button-quiet reply-toggle",
      type: "button",
      "aria-expanded": "false",
      "aria-controls": formId,
      "data-reply-toggle": thread.id
    }, "Reply");

    var nameId = "reply-name-" + safeId;
    var bodyId = "reply-body-" + safeId;
    var bodyErrorId = "reply-body-error-" + safeId;
    var form = el("form", {
      class: "stack reply-form",
      id: formId,
      method: "post",
      action: "forum.html",
      novalidate: "novalidate",
      hidden: true,
      "data-reply-form": thread.id
    });
    form.append(
      el("div", { class: "field" }, [
        el("label", { for: nameId }, ["Name ", el("span", { class: "hint" }, "optional")]),
        el("input", { id: nameId, name: "displayName", type: "text", maxlength: "40", autocomplete: "off" })
      ]),
      el("div", { class: "field" }, [
        el("label", { for: bodyId }, "Reply"),
        el("textarea", {
          id: bodyId,
          name: "body",
          maxlength: "4000",
          rows: "4",
          "aria-describedby": bodyErrorId
        }),
        el("p", { id: bodyErrorId, class: "field-error", hidden: true })
      ]),
      el("div", {}, el("button", { class: "button", type: "submit" }, "Post reply"))
    );

    article.append(toggle, form);
    return article;
  }

  function renderFeed(threads, freshId) {
    var feed = document.getElementById("feed");
    feed.replaceChildren();
    if (!threads.length) {
      feed.append(el("p", { class: "empty" }, "No notes yet."));
      return;
    }
    threads.forEach(function (thread) {
      feed.append(renderThread(thread, freshId));
    });
  }

  function focusThread(threadId) {
    var node = document.getElementById("thread-title-" + domId(threadId));
    if (!node) return;
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    node.focus({ preventScroll: true });
    node.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
  }

  async function refresh(freshId) {
    var threads = await ForumStore.listThreads();
    renderFeed(threads, freshId);
    if (freshId) focusThread(freshId);
  }

  function readFields(form) {
    return {
      displayName: form.elements.displayName ? form.elements.displayName.value : "",
      title: form.elements.title ? form.elements.title.value : "",
      body: form.elements.body ? form.elements.body.value : ""
    };
  }

  async function init() {
    var feed = document.getElementById("feed");
    var compose = document.getElementById("compose-form");
    if (!feed || !compose || !window.ForumStore) return;

    var busy = false;
    await refresh(null);

    if (!ForumStore.savesInBrowser()) {
      setStatus("Posts will last until this page is closed. This browser did not allow saving.");
    }

    compose.addEventListener("submit", async function (event) {
      event.preventDefault();
      if (busy) return;
      clearFormErrors(compose);
      var fields = readFields(compose);
      var errors = fieldErrors(fields, true);
      if (errors.title) showError(compose.elements.title, errors.title);
      if (errors.body) showError(compose.elements.body, errors.body);
      if (errors.title || errors.body) {
        (errors.title ? compose.elements.title : compose.elements.body).focus();
        return;
      }
      busy = true;
      try {
        var thread = await ForumStore.createThread(fields);
        compose.reset();
        setStatus("Your note is posted.");
        await refresh(thread.id);
      } catch (err) {
        setStatus(err && err.message ? err.message : "The note could not be saved in this browser.");
      } finally {
        busy = false;
      }
    });

    feed.addEventListener("click", function (event) {
      var button = event.target.closest("[data-reply-toggle]");
      if (!button) return;
      var form = document.getElementById(button.getAttribute("aria-controls"));
      if (!form) return;
      var willOpen = form.hasAttribute("hidden");
      form.hidden = !willOpen;
      button.setAttribute("aria-expanded", willOpen ? "true" : "false");
      if (willOpen && form.elements.body) form.elements.body.focus();
    });

    feed.addEventListener("submit", async function (event) {
      var form = event.target;
      if (!form.matches || !form.matches("[data-reply-form]")) return;
      event.preventDefault();
      if (busy) return;
      clearFormErrors(form);
      var fields = readFields(form);
      var errors = fieldErrors(fields, false);
      if (errors.body) {
        showError(form.elements.body, errors.body);
        form.elements.body.focus();
        return;
      }
      busy = true;
      try {
        var threadId = form.getAttribute("data-reply-form");
        await ForumStore.createReply(threadId, fields);
        setStatus("Your reply is posted.");
        await refresh(threadId);
      } catch (err) {
        setStatus(err && err.message ? err.message : "The reply could not be saved in this browser.");
      } finally {
        busy = false;
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      init();
    });
  } else {
    init();
  }
})();
