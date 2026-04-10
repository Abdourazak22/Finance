from datetime import date
from django.shortcuts import render
from django.http import JsonResponse
from django.contrib.auth import get_user_model
from rest_framework import viewsets, filters, generics, status
from rest_framework.decorators import action
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.utils import timezone
from django.db.models import Sum, Q
from .serializers import TransactionSerializer, CategorieSerializer, TransactionSummarySerializer, DetteSerializer, BudgetSerializer, RegisterSerializer, UserSerializer, ChangePasswordSerializer, FactureSerializer, LigneFactureSerializer
from .models import Categorie, Transaction, Dette, Budget, Facture, LigneFacture
from .filters import TransactionFilter
from datetime import date, timedelta

User = get_user_model()

# ══════════════════════════════════════════════════════
### Categorie View
# ══════════════════════════════════════════════════════
class CategorieViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = CategorieSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Categorie.objects.all()

    @action(detail=False, methods=['get'], url_path='entrees')
    def entrees(self, request):
        qs = Categorie.objects.filter(type='entree')
        return Response(CategorieSerializer(qs, many=True).data)

    @action(detail=False, methods=['get'], url_path='sorties')
    def sorties(self, request):
        qs = Categorie.objects.filter(type='sortie')
        return Response(CategorieSerializer(qs, many=True).data)


# ══════════════════════════════════════════════════════
### Transaction View
# ══════════════════════════════════════════════════════
class TransactionViewSet(viewsets.ModelViewSet):
    serializer_class = TransactionSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = TransactionFilter
    search_fields = ['description']
    ordering_fields = ['date', 'montant', 'created_at']
    ordering = ['-date']

    def get_queryset(self):
        return Transaction.objects.filter(
            user=self.request.user
        ).select_related('categorie')

    @action(detail=False, methods=['get'], url_path='resume')
    def resume(self, request):
        qs = self.get_queryset()
        mois = request.query_params.get('mois', timezone.now().month)
        annee = request.query_params.get('annee', timezone.now().year)

        qs = qs.filter(
            date__month=mois,   # ✅ double underscore
            date__year=annee,   # ✅ double underscore
            statut='confirme'
        )

        total_entrees = qs.filter(type='entree').aggregate(t=Sum('montant'))['t'] or 0
        total_sorties = qs.filter(type='sortie').aggregate(t=Sum('montant'))['t'] or 0

        data = {
            'total_entrees':   total_entrees,
            'total_sorties':   total_sorties,
            'solde':           total_entrees - total_sorties,  # ✅ pas d'espace dans la clé
            'nb_transactions': qs.count(),
        }
        return Response(TransactionSummarySerializer(data).data)

    @action(detail=False, methods=['get'], url_path='flux_journalier')
    def flux_journalier(self, request):
        from django.db.models.functions import TruncDate

        jours = int(request.query_params.get('jours', 30))
        depuis = date.today() - timedelta(days=jours - 1)

        qs = self.get_queryset().filter(  # ✅ self.get_queryset() pas qs.get_queryset()
            date__gte=depuis,             # ✅ double underscore
            statut='confirme'
        )

        entrees = (
            qs.filter(type='entree')
            .annotate(jour=TruncDate('date'))
            .values('jour')
            .annotate(total=Sum('montant'))
            .order_by('jour')
        )

        sorties = (
            qs.filter(type='sortie')
            .annotate(jour=TruncDate('date'))
            .values('jour')
            .annotate(total=Sum('montant'))
            .order_by('jour')
        )

        return Response({
            'entrees': list(entrees),
            'sorties': list(sorties),  # ✅ list() pas self.list()
        })


# ══════════════════════════════════════════════════════
### Dette View
# ══════════════════════════════════════════════════════
class DetteViewSet(viewsets.ModelViewSet):
    serializer_class = DetteSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['type', 'statut']
    search_fields = ['tiers', 'description']
    ordering_fields = ['echeance', 'montant_total']

    def get_queryset(self):
        return Dette.objects.filter(user=self.request.user)

    @action(detail=False, methods=['get'], url_path='stats')
    def stats(self, request):
        qs = self.get_queryset().exclude(statut='solde')
        total_dettes = qs.filter(type='dette').aggregate(t=Sum('montant_total'))['t'] or 0      # ✅ filter pas filtert
        total_creances = qs.filter(type='creance').aggregate(t=Sum('montant_total'))['t'] or 0  # ✅ filter pas filtert
        echeances_proches = qs.filter(
            echeance__lte=timezone.now().date() + timedelta(days=7)
        ).count()

        return Response({
            'total_dettes':      total_dettes,
            'total_creances':    total_creances,
            'echeances_proches': echeances_proches,
        })


# ══════════════════════════════════════════════════════
### Budget View
# ══════════════════════════════════════════════════════
class BudgetViewSet(viewsets.ModelViewSet):
    serializer_class = BudgetSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Budget.objects.filter(user=self.request.user).select_related('categorie')

    @action(detail=False, methods=['get'], url_path='suivi')
    def suivi(self, request):
        mois = int(request.query_params.get('mois', timezone.now().month))
        annee = int(request.query_params.get('annee', timezone.now().year))

        budgets = self.get_queryset().filter(mois=mois, annee=annee)
        result = []
        for b in budgets:
            depense = Transaction.objects.filter(
                user=request.user,
                categorie=b.categorie,
                type='sortie',
                date__month=mois,
                date__year=annee,
                statut='confirme'
            ).aggregate(t=Sum('montant'))['t'] or 0

            pct = round((float(depense) / float(b.montant)) * 100, 1) if b.montant else 0
            result.append({
                'budget_id':  b.id,
                'categorie':  b.categorie.nom,
                'montant_max': b.montant,
                'depense':    depense,
                'restant':    float(b.montant) - float(depense),
                'pourcentage': pct,
                'depasse':    pct > 100,
            })
        return Response(result)  # ✅ en dehors du for


# ══════════════════════════════════════════════════════
### Auth Views
# ══════════════════════════════════════════════════════
class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            'tokens': {
                'refresh': str(refresh),
                'access':  str(refresh.access_token),
            }
        }, status=status.HTTP_201_CREATED)


class LoginView(TokenObtainPairView):
    permission_classes = [AllowAny]


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data["refresh"]
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({"detail": "Deconnexion reussie"}, status=status.HTTP_205_RESET_CONTENT)
        except Exception:
            return Response({"detail": "Token invalide"}, status=status.HTTP_400_BAD_REQUEST)  # ✅ return manquait


class ProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = request.user
        if not user.check_password(serializer.validated_data['ancien_password']):
            return Response({"ancien_password": "Mot de passe incorrect"}, status=400)
        user.set_password(serializer.validated_data['nouveau_password'])
        user.save()
        return Response({"detail": "Mot de passe modifié"})


# class FactureViewSet(viewsets.ModelViewSet):
#     serializer_class = FactureSerializer
#     permission_classes = [IsAuthenticated]
#     filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
#     filterset_fields = ['statut']
#     search_fields = ['numero', 'client_nom']
#     ordering_fields = ['date_emission', 'montant_total', 'created_at']
#     ordering = ['-date_emission']
#
#     def get_queryset(self):
#         return Facture.objects.filter(user=self.request.user).prefetch_related('lignes')
#
#     # @action(detail=True, methods=['post'], url_path='ajouter_ligne')
#     # def ajouter_ligne(self, request, pk=None):
#     #     facture = self.get_object()
#     #     serializer = LigneFactureSerializer(data=request.data)
#     #     serializer.is_valid(raise_exception=True)
#     #     serializer.save(facture=facture)
#     #     # Retourner la facture complète mise à jour
#     #     return Response(FactureSerializer(facture, context={'request': request}).data)
#
#        @action(detail=True, methods=['post'], url_path='ajouter_ligne')
#        def ajouter_ligne(self, request, pk=None):
#            facture = self.get_object()
#            serializer = LigneFactureSerializer(data=request.data)
#            serializer.is_valid(raise_exception=True)
#            serializer.save(facture=facture)
#             # ✅ Recharger la facture depuis la DB après recalcul
#            facture.refresh_from_db()
#            return Response(FactureSerializer(facture, context={'request': request}).data)
#
#     @action(detail=True, methods=['delete'], url_path='supprimer_ligne/(?P<ligne_id>[^/.]+)')
#     def supprimer_ligne(self, request, pk=None, ligne_id=None):
#         facture = self.get_object()
#         try:
#             ligne = facture.lignes.get(id=ligne_id)
#             ligne.delete()
#             facture.recalculer_totaux()
#             return Response(FactureSerializer(facture, context={'request': request}).data)
#         except LigneFacture.DoesNotExist:
#             return Response({'detail': 'Ligne introuvable'}, status=404)
#
#     @action(detail=True, methods=['post'], url_path='changer_statut')
#     def changer_statut(self, request, pk=None):
#         facture = self.get_object()
#         nouveau_statut = request.data.get('statut')
#         statuts_valides = ['brouillon', 'envoyee', 'payee', 'en_attente', 'annulee']
#         if nouveau_statut not in statuts_valides:
#             return Response({'detail': 'Statut invalide'}, status=400)
#         facture.statut = nouveau_statut
#         facture.save()
#         return Response(FactureSerializer(facture, context={'request': request}).data)
#
#     @action(detail=False, methods=['get'], url_path='stats')
#     def stats(self, request):
#         qs = self.get_queryset()
#         from django.db.models import Count
#         return Response({
#             'total':       qs.count(),
#             'payees':      qs.filter(statut='payee').count(),
#             'en_attente':  qs.filter(statut='en_attente').count(),
#             'brouillons':  qs.filter(statut='brouillon').count(),
#             'annulees':    qs.filter(statut='annulee').count(),
#             'montant_total_paye': qs.filter(statut='payee').aggregate(t=Sum('montant_total'))['t'] or 0,
#             'montant_en_attente': qs.filter(statut='en_attente').aggregate(t=Sum('montant_total'))['t'] or 0,
#         })

class FactureViewSet(viewsets.ModelViewSet):
    serializer_class = FactureSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['statut']
    search_fields = ['numero', 'client_nom']
    ordering_fields = ['date_emission', 'montant_total', 'created_at']
    ordering = ['-date_emission']

    def get_queryset(self):
        return Facture.objects.filter(user=self.request.user).prefetch_related('lignes')

    @action(detail=True, methods=['post'], url_path='ajouter_ligne')
    def ajouter_ligne(self, request, pk=None):
        facture = self.get_object()
        serializer = LigneFactureSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(facture=facture)
        facture.refresh_from_db()
        return Response(FactureSerializer(facture, context={'request': request}).data)

    @action(detail=True, methods=['delete'], url_path='supprimer_ligne/(?P<ligne_id>[^/.]+)')
    def supprimer_ligne(self, request, pk=None, ligne_id=None):
        facture = self.get_object()
        try:
            ligne = facture.lignes.get(id=ligne_id)
            ligne.delete()
            facture.refresh_from_db()
            return Response(FactureSerializer(facture, context={'request': request}).data)
        except LigneFacture.DoesNotExist:
            return Response({'detail': 'Ligne introuvable'}, status=404)

    @action(detail=True, methods=['post'], url_path='changer_statut')
    def changer_statut(self, request, pk=None):
        facture = self.get_object()
        nouveau_statut = request.data.get('statut')
        statuts_valides = ['brouillon', 'envoyee', 'payee', 'en_attente', 'annulee']
        if nouveau_statut not in statuts_valides:
            return Response({'detail': 'Statut invalide'}, status=400)
        facture.statut = nouveau_statut
        facture.save()
        return Response(FactureSerializer(facture, context={'request': request}).data)

    @action(detail=False, methods=['get'], url_path='stats')
    def stats(self, request):
        qs = self.get_queryset()
        return Response({
            'total':              qs.count(),
            'payees':             qs.filter(statut='payee').count(),
            'en_attente':         qs.filter(statut='en_attente').count(),
            'brouillons':         qs.filter(statut='brouillon').count(),
            'annulees':           qs.filter(statut='annulee').count(),
            'montant_total_paye': qs.filter(statut='payee').aggregate(t=Sum('montant_total'))['t'] or 0,
            'montant_en_attente': qs.filter(statut='en_attente').aggregate(t=Sum('montant_total'))['t'] or 0,
        })
