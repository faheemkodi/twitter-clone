// Show respective views for SPA
document.addEventListener("DOMContentLoaded", () => {
  document.querySelector("#all-posts-link").onclick = (event) => {
    // Preserve SPA effect for logged in users
    if (document.querySelector("#my-profile-link")) {
      event.preventDefault();
    }
    allPostsView();
  };
  if (document.querySelector("#following-link")) {
    document.querySelector("#following-link").onclick = (event) => {
      event.preventDefault();
      const myself = document.querySelector("#my-profile-link").innerText;
      followingView(myself);
    };
  }
  if (document.querySelector("#my-profile-link")) {
    document.querySelector("#my-profile-link").onclick = (event) => {
      event.preventDefault();
      const myself = document.querySelector("#my-profile-link").innerText;
      profileView(myself);
    };
  }
  allPostsView();
});

function allPostsView() {
  const view = document.querySelector("#all-posts-view");
  if (view) {
    view.style.display = "block";
    view.replaceChildren();
    document.querySelector("#following-view").replaceChildren();
    document.querySelector("#profile-view").replaceChildren();
    const heading = document.createElement("h2");
    heading.innerHTML = "All Posts";

    const form = document.createElement("div");
    form.classList.add("card", "p-4");
    form.innerHTML = `
      <form id="post-form" method="post">
        <h4>New Post</h4>
        <textarea id="post-content" class="form-control mb-2" rows="3"></textarea>
        <input class="btn btn-primary" type="submit" value="Post"> 
      </form>
    `;

    const allPosts = document.createElement("div");
    allPosts.id = "all-posts-posts";
    allPosts.className = "my-3";
    view.append(heading, form, allPosts);

    document.querySelector("#post-form").onsubmit = (event) => {
      event.preventDefault();
      if (document.querySelector("#post-content").value !== "") {
        post();
      }
    };

    getPosts("all-posts", 1);
  }
}

function followingView(username) {
  const view = document.querySelector("#following-view");
  view.style.display = "block";
  view.replaceChildren();
  document.querySelector("#all-posts-view").replaceChildren();
  document.querySelector("#profile-view").replaceChildren();

  const heading = document.createElement("h2");
  heading.innerHTML = `${username}'s following`;

  const followingPosts = document.createElement("div");
  followingPosts.id = "following-posts";
  followingPosts.className = "my-3";

  view.append(heading, followingPosts);
  getPosts("following", 1);
}

function profileView(username) {
  const view = document.querySelector("#profile-view");
  view.style.display = "block";
  view.replaceChildren();
  document.querySelector("#all-posts-view").replaceChildren();
  document.querySelector("#following-view").replaceChildren();

  const heading = document.createElement("h2");
  heading.innerHTML = `${username}'s profile`;

  const profileStats = document.createElement("div");
  profileStats.classList.add("card", "p-3");
  profileStats.innerHTML = `
    <div class="row text-center lead font-weight-bold text-dark">
      <div class="col-6">
      <p>Following</p>
      <p id="following">0</p>
      </div>
      <div class="col-6">
        <p>Followers</p>
        <p id="followers">0</p>
      </div>
    </div>   
  `;

  if (
    document.querySelector("#my-profile-link") &&
    document.querySelector("#my-profile-link").innerText !== username
  ) {
    const followButton = document.createElement("button");
    followButton.id = "follow";
    followButton.classList.add("btn", "btn-primary");
    followButton.innerText = "Follow";
    profileStats.append(followButton);
    followButton.onclick = () => {
      followUser(username);
    };
  }

  const profilePosts = document.createElement("div");
  profilePosts.id = username + "-posts";
  profilePosts.className = "my-3";

  view.append(heading, profileStats, profilePosts);

  getStats(username);
  getPosts(username, 1);
}

// Get csrf token from cookies
function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== "") {
    const cookies = document.cookie.split(";");
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === name + "=") {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

async function post() {
  if (!document.querySelector("#my-profile-link")) {
    const origin = location.origin;
    location.replace(origin + "/login");
  }
  const content = document.querySelector("#post-content").value;
  const csrftoken = getCookie("csrftoken");
  try {
    await fetch("/post", {
      method: "POST",
      headers: { "X-CSRFToken": csrftoken },
      body: JSON.stringify({
        content: content,
      }),
    });
  } catch (error) {
    console.log(error);
  }

  allPostsView();
}

async function getPosts(collection, page) {
  try {
    const csrftoken = getCookie("csrftoken");
    const response = await fetch("/posts", {
      method: "POST",
      headers: { "X-CSRFToken": csrftoken },
      body: JSON.stringify({
        collection: collection,
        page: page,
      }),
    });
    const data = await response.json();
    const posts = data["posts"];
    const pages = data["pages"];

    for (let i = 0; i < posts.length; i++) {
      let post = document.createElement("div");
      let postId = posts[i]["id"];

      post.innerHTML = `
        <div id="post-${postId}" class="card p-3 mb-2">
            <a href="#" class="profile-link align-self-start text-dark">
            <h4>${posts[i]["user"]}</h4>
            </a>
            <a style="display: none;" href="#" class="edit-link ${posts[i]["user"]} align-self-start">Edit</a>
            <p id="content-${postId}" class="mb-2">${posts[i]["content"]}</p>
            <p class="text-muted font-weight-bold">
            <i id="like-${postId}" class="like fa-regular fa-heart" style="cursor: pointer;"> ${posts[i]["likes"]} </i>
            </p>
            <p class="small text-muted">${posts[i]["timestamp"]}</p>
        </div>
      `;
      document.querySelector("#" + collection + "-posts").append(post);
      if (posts[i]["liked"] === true) {
        let el = document.getElementById(`like-${postId}`);
        el.classList.replace("fa-regular", "fa-solid");
        el.classList.add("text-danger");
      }
    }

    // Edit link
    document.querySelectorAll(".edit-link").forEach((link) => {
      if (
        document.querySelector("#my-profile-link") &&
        link.classList.contains(
          document.querySelector("#my-profile-link").innerText
        )
      ) {
        link.style.display = "block";
        link.onclick = (event) => {
          event.preventDefault();
          editPost(parseInt(link.parentElement.id.split("-")[1]));
        };
      }
    });

    // Pagination
    if (pages > 1) {
      if (document.querySelector("#paginator-container") === null) {
        const paginator = document.createElement("div");
        paginator.id = "paginator-container";
        paginator.classList.add("d-flex", "justify-content-center");
        paginator.innerHTML = `
          <nav>
            <ul id="paginator" class="pagination"></ul>
          </nav>
        `;

        if (collection === "all-posts" || collection === "following") {
          document.querySelector("#" + collection + "-view").append(paginator);
        } else {
          document.querySelector("#profile-view").append(paginator);
        }

        for (let i = 1; i < pages + 1; i++) {
          let el = document.createElement("li");
          el.className = "page-item";
          el.innerHTML = `
          <a class="page-link" id="page-${i}" href="#">${i}</a>
        `;
          document.querySelector("#paginator").append(el);
        }

        const prev = document.createElement("li");
        prev.className = "page-item";
        prev.innerHTML = `
          <a class="page-link" id="prev" href="#">Prev</a>
      `;
        document.querySelector("#paginator").prepend(prev);

        const next = document.createElement("li");
        next.className = "page-item";
        next.innerHTML = `
          <a class="page-link" id="next" href="#">Next</a>
      `;
        document.querySelector("#paginator").append(next);

        document.querySelector("#page-1").parentElement.classList.add("active");
      }

      let activePage = parseInt(document.querySelector(".active").innerText);

      document.querySelectorAll(".page-link").forEach((pageLink) => {
        pageLink.onclick = (event) => {
          event.preventDefault();
          document.querySelector("#" + collection + "-posts").replaceChildren();
          document
            .querySelectorAll(".page-link")
            .forEach((pageLink) =>
              pageLink.parentElement.classList.remove("active")
            );
          if (pageLink.id === "prev") {
            getPosts(collection, activePage - 1);
            document
              .querySelector(`#page-${activePage - 1}`)
              .parentElement.classList.add("active");
          } else if (pageLink.id === "next") {
            getPosts(collection, activePage + 1);
            document
              .querySelector(`#page-${activePage + 1}`)
              .parentElement.classList.add("active");
          } else {
            getPosts(collection, parseInt(pageLink.innerHTML));
            pageLink.parentElement.classList.add("active");
          }
        };
      });

      if (activePage === 1) {
        document.querySelector("#prev").parentElement.style.display = "none";
      } else {
        document.querySelector("#prev").parentElement.style.display = "block";
      }

      if (activePage === pages) {
        document.querySelector("#next").parentElement.style.display = "none";
      } else {
        document.querySelector("#next").parentElement.style.display = "block";
      }
    }
  } catch (error) {
    console.log(error);
  }

  // Profile link
  document.querySelectorAll(".profile-link").forEach(
    (link) =>
      (link.onclick = (event) => {
        let username = link.innerText;
        event.preventDefault();
        profileView(username);
      })
  );

  // Like button
  document.querySelectorAll(".like").forEach(
    (like) =>
      (like.onclick = () => {
        likePost(like.id.split("-")[1]);
      })
  );
}

async function editPost(id) {
  const postContent = document.querySelector(`#content-${id}`);
  const postEditor = document.createElement("div");
  postEditor.classList.add("mb-3");
  postEditor.innerHTML = `
    <textarea class="form-control mb-2" id="new-${id}">${postContent.innerText}</textarea>
    <button class="btn btn-primary save">Save</button>
    <button class="btn btn-dark cancel">Cancel</button>
  `;
  postContent.replaceWith(postEditor);

  document.querySelectorAll(".cancel").forEach((cancel) => {
    cancel.onclick = () => {
      postEditor.replaceWith(postContent);
    };
  });

  console.log(document.querySelector(`#new-${id}`).value);

  document.querySelectorAll(".save").forEach((save) => {
    save.onclick = async () => {
      const csrftoken = getCookie("csrftoken");
      const content = document.querySelector(`#new-${id}`).value;
      if (content !== "") {
        try {
          const response = await fetch("/post", {
            method: "PUT",
            headers: { "X-CSRFToken": csrftoken },
            body: JSON.stringify({
              id: id,
              content: content,
            }),
          });
          const data = await response.json();
          postContent.innerText = data["content"];
        } catch (error) {
          console.log(error);
        }
      }
      postEditor.replaceWith(postContent);
    };
  });
}

async function likePost(id) {
  if (!document.querySelector("#my-profile-link")) {
    const origin = location.origin;
    location.replace(origin + "/login");
  }
  const csrftoken = getCookie("csrftoken");
  try {
    const response = await fetch("/like", {
      method: "POST",
      headers: { "X-CSRFToken": csrftoken },
      body: JSON.stringify({
        id: id,
      }),
    });
    const data = await response.json();
    const el = document.getElementById(`like-${id}`);
    el.innerHTML = ` ${data["like_count"]}`;
    if (data["liked"] === true) {
      el.classList.replace("fa-regular", "fa-solid");
      el.classList.add("text-danger");
    } else {
      el.classList.replace("fa-solid", "fa-regular");
      el.classList.remove("text-danger");
    }
  } catch (error) {
    console.log(error);
  }
}

async function followUser(username) {
  const csrftoken = getCookie("csrftoken");
  try {
    const response = await fetch("/follow", {
      method: "POST",
      headers: { "X-CSRFToken": csrftoken },
      body: JSON.stringify({
        username: username,
      }),
    });
    const data = await response.json();
    if (data["following"] === true) {
      document.querySelector("#follow").innerText = "Unfollow";
    } else {
      document.querySelector("#follow").innerText = "Follow";
    }
  } catch (error) {
    console.log(error);
  }
  getStats(username);
}

async function getStats(username) {
  const csrftoken = getCookie("csrftoken");
  try {
    const response = await fetch("/stats", {
      method: "POST",
      headers: { "X-CSRFToken": csrftoken },
      body: JSON.stringify({
        username: username,
      }),
    });
    const data = await response.json();

    document.querySelector("#following").innerText = data["following"];
    document.querySelector("#followers").innerText = data["followers"];
    if (
      document.querySelector("#my-profile-link") &&
      document.querySelector("#my-profile-link").innerText !== username &&
      data["followed"] === true
    ) {
      document.querySelector("#follow").innerText = "Unfollow";
    }
  } catch (error) {
    console.log(error);
  }
}
