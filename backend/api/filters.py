import django_filters # type: ignore
from .models import Transaction

class TransactionFilter(django_filters.FilterSet):
    date_min = django_filters.DateFilter(field_name='date',lookup_expr='gte')
    date_max = django_filters.DateFilter(field_name='date',lookup_expr='lte')
    montant_min = django_filters.NumberFilter(field_name='montant',lookup_expr='gte')
    montant_max = django_filters.NumberFilter(field_name='montant',lookup_expr='lte')
    mois = django_filters.NumberFilter(field_name='date',lookup_expr='month')
    annee = django_filters.NumberFilter(field_name='date',lookup_expr='year')
    
    class Meta:
        model = Transaction
        fields = ['type','statut','categorie','date_min','date_max','mois','annee']