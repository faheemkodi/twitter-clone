import json
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.db import IntegrityError
from django.http import HttpResponseRedirect, JsonResponse
from django.shortcuts import render
from django.urls import reverse
from django.core.paginator import Paginator

from .models import User, Follower, Post, Like


def index(request):
    return render(request, "network/index.html")


def login_view(request):
    if request.method == "POST":

        # Attempt to sign user in
        username = request.POST["username"]
        password = request.POST["password"]
        user = authenticate(request, username=username, password=password)

        # Check if authentication successful
        if user is not None:
            login(request, user)
            return HttpResponseRedirect(reverse("network:index"))
        else:
            return render(request, "network/login.html", {
                "message": "Invalid username and/or password."
            })
    else:
        if request.user.id != None:
            return HttpResponseRedirect(reverse("network:index"))
        return render(request, "network/login.html")


def logout_view(request):
    logout(request)
    return HttpResponseRedirect(reverse("network:index"))


def register(request):
    if request.method == "POST":
        username = request.POST["username"]
        email = request.POST["email"]

        # Ensure password matches confirmation
        password = request.POST["password"]
        confirmation = request.POST["confirmation"]
        if password != confirmation:
            return render(request, "network/register.html", {
                "message": "Passwords must match."
            })

        # Attempt to create new user
        try:
            user = User.objects.create_user(username, email, password)
            user.save()
        except IntegrityError:
            return render(request, "network/register.html", {
                "message": "Username already taken."
            })
        login(request, user)
        return HttpResponseRedirect(reverse("network:index"))
    else:
        if request.user.id != None:
            return HttpResponseRedirect(reverse("network:index"))
        return render(request, "network/register.html")


@login_required(login_url="network:login")
def post(request):
    if request.method == "POST":
        data = json.loads(request.body)
        content = data.get("content")
        post = Post(content=content, user=request.user)
        post.save()
        return JsonResponse({"message": "Post created successfully."}, status=201)
    
    # Edit post
    if request.method == "PUT":
        data = json.loads(request.body)
        id = int(data.get("id"))
        content = data.get("content")
        post = Post.objects.get(pk=id)

        # Prevent user from editing another user's posts
        if request.user.id != post.user_id:
            return HttpResponseRedirect(reverse("network:index"))
        post.content = content
        post.save()
        return JsonResponse({"content": content}, status=200)
    else:
        return HttpResponseRedirect(reverse("network:index"))


def posts(request):
    if request.method != "POST":
        return HttpResponseRedirect(reverse("network:index"))
    data = json.loads(request.body)
    collection = data.get("collection")
    user = request.user
    serialized_posts = []

    if collection == "all-posts":
        posts = Post.objects.all().order_by("-timestamp") 
    elif collection == "following":
        followed_users = user.following.all()
        followed_user_id_list = []
        for followed_user in followed_users:
           followed_user_id_list.append(followed_user.following_user.id)
        posts = Post.objects.filter(user_id__in=followed_user_id_list).all().order_by("-timestamp")
    else:
        profile = User.objects.get(username=collection)
        posts = Post.objects.filter(user_id=profile.id).all().order_by("-timestamp")

    for post in posts:
        serialized_post = post.serialize()
        serialized_post["liked"] = False
        likes = post.likes.all()
        for like in likes:
            if user.id == like.user.id:
                serialized_post.update(liked=True)
                break
        serialized_posts.append(serialized_post)

    paginator = Paginator(serialized_posts, 10)
    page_number = data.get("page")
    page_object = paginator.get_page(page_number)
        
    return JsonResponse({"posts": page_object.object_list, "pages": paginator.num_pages}, safe=False)


@login_required(login_url="network:login")
def like(request):
    if request.method != "POST":
        return HttpResponseRedirect(reverse("network:index"))

    data = json.loads(request.body)
    post_id = data.get("id")
    user = request.user
    post = Post.objects.get(pk=int(post_id))

    # Unlike if liked already
    for like in post.likes.all():
        if user.id == like.user.id:
            like.delete()
            like_count = len(post.likes.all())
            return JsonResponse({"like_count": like_count, "liked": False})

    like = Like(post=post, user=user)
    like.save()

    like_count = len(post.likes.all())
    return JsonResponse({"like_count": like_count, "liked": True})


def stats(request):
    if request.method != "POST":
        return HttpResponseRedirect(reverse("network:index"))
    data = json.loads(request.body)
    username = data.get("username")

    user = User.objects.get(username=username)
    followers = len(user.followers.all())
    following = len(user.following.all())

    if request.user.username == username:
        return JsonResponse({"following": following, "followers": followers})

    # Check if following
    followed = False
    for follower in user.followers.all():
        if follower.user.id == request.user.id:
            followed = True
            break

    return JsonResponse({"following": following, "followers": followers, "followed": followed})
        

@login_required(login_url="network:login")
def follow(request):
    if request.method != "POST":
        return HttpResponseRedirect(reverse("network:index"))

    user = request.user
    data = json.loads(request.body)
    following_username = data.get("username")
    following_user = User.objects.get(username=following_username)

    if user == following_user:
        return HttpResponseRedirect(reverse("network:index"))

    # Unfollow if already following
    following = user.following.all()
    
    for followed_user in following:
        if followed_user.following_user.id == following_user.id:
            followed_user.delete()
            return JsonResponse({"following": False})

    follower = Follower(user=request.user, following_user=following_user)
    follower.save()

    return JsonResponse({"following": True})