from django.urls import path, include
from .views import CategorieViewSet, TransactionViewSet, DetteViewSet, BudgetViewSet, RegisterView, LoginView, ProfileView,  FactureViewSet
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView


router = DefaultRouter()
router.register(r'categories',   CategorieViewSet,   basename='categorie')
router.register(r'transactions', TransactionViewSet, basename='transaction')
router.register(r'dettes',       DetteViewSet,       basename='dette')
router.register(r'budgets',      BudgetViewSet,      basename='budget'),
router.register(r'factures',     FactureViewSet,     basename='facture')

urlpatterns = [
    path('auth/register/',      RegisterView.as_view(),       name='register'),
    path('auth/login/',         LoginView.as_view(),          name='login'),
    path('auth/profile/',       ProfileView.as_view(),        name='profile'),
    path('auth/token/refresh/', TokenRefreshView.as_view(),   name='token_refresh'),  # ← ajouté

    path('', include(router.urls)),
]
