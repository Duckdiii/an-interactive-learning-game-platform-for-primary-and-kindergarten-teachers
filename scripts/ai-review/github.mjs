// Client GitHub REST tối thiểu cho script post. Không bao giờ ghi token ra log hay thông báo lỗi.

export class GithubError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export class Github {
  /**
   * @param {{token: string, repo: string, fetchImpl?: typeof fetch, apiUrl?: string}} o
   */
  constructor({ token, repo, fetchImpl = globalThis.fetch, apiUrl = "https://api.github.com" }) {
    if (!token) throw new Error("Thiếu GITHUB_TOKEN");
    if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) throw new Error("repo phải có dạng owner/name");
    this.token = token;
    this.repo = repo;
    this.fetch = fetchImpl;
    this.apiUrl = apiUrl;
  }

  async #request(method, path, { body, accept = "application/vnd.github+json" } = {}) {
    const res = await this.fetch(`${this.apiUrl}/repos/${this.repo}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: accept,
        "X-GitHub-Api-Version": "2022-11-28",
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      let detail = "";
      try { detail = (await res.json()).message ?? ""; } catch { /* không có thân JSON */ }
      throw new GithubError(res.status, `${method} ${path} -> ${res.status} ${detail}`.trim());
    }
    return accept.includes("diff") ? res.text() : res.status === 204 ? null : res.json();
  }

  async #paginate(path) {
    const all = [];
    for (let page = 1; page <= 20; page++) {
      const items = await this.#request("GET", `${path}${path.includes("?") ? "&" : "?"}per_page=100&page=${page}`);
      all.push(...items);
      if (items.length < 100) break;
    }
    return all;
  }

  getPull(n) { return this.#request("GET", `/pulls/${n}`); }
  /** So sánh hai commit: status là "ahead" khi head nằm sau base trên cùng một nhánh (không bị force-push/rebase). */
  compare(base, head) { return this.#request("GET", `/compare/${base}...${head}?per_page=1`); }
  getCompareDiff(base, head) { return this.#request("GET", `/compare/${base}...${head}`, { accept: "application/vnd.github.diff" }); }
  getDiff(n) { return this.#request("GET", `/pulls/${n}`, { accept: "application/vnd.github.diff" }); }
  listReviewComments(n) { return this.#paginate(`/pulls/${n}/comments`); }
  listIssueComments(n) { return this.#paginate(`/issues/${n}/comments`); }
  createReview(n, payload) { return this.#request("POST", `/pulls/${n}/reviews`, { body: payload }); }
  createIssueComment(n, body) { return this.#request("POST", `/issues/${n}/comments`, { body: { body } }); }
  updateIssueComment(id, body) { return this.#request("PATCH", `/issues/comments/${id}`, { body: { body } }); }
}
