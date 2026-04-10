from django.db import models
from django.conf import settings

from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin

# Create your models here.
### Categorie Model
class Categorie(models.Model):
    TYPE_CHOICES = [
        ('entree','Entree'),
        ('sortie','Sortie')
    ]
    nom = models.CharField(max_length=100)
    type = models.CharField(max_length=10, choices=TYPE_CHOICES)
    
    class Meta:
        db_table = 'categorie'
        verbose_name='Categorie'
        
    def __str__(self):
        return f"{self.nom} ({self.type})"
    
class Transaction(models.Model):
    TYPE_CHOICES = [
        ('entree','Entree'),
        ('sortie','Sortie')
    ]
    STATUT_CHOICES = [
        ('confirme', 'Confirmé'),
        ('en_attente','En attente'),
        ('annulé', 'Annulée'),
    ]
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='transactions')
    type = models.CharField(max_length=25, choices=TYPE_CHOICES)
    description = models.CharField(max_length=255)
    categorie = models.ForeignKey(Categorie, on_delete=models.SET_NULL, null=True,blank=True, related_name='transactions')
    date = models.DateField()
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES)
    montant = models.DecimalField(max_digits=10, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'transactions'
        ordering = ['-date', '-created_at']
        verbose_name='Transaction'
        
    def __str__(self):
        return f"{self.type.upper()} | {self.montant}-{self.description}"
    
    ## Dette Model
    
class Dette(models.Model):
    TYPE_CHOICES = [
        ('dette','je dois'),
        ('creance','On me doit')
    ]
    STATUT_CHOICES = [
        ('en_cours', 'En cours'),
        ('partiel','Partielement emboursé'),
        ('en_retard', 'En retard'),
    ]
        
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='dettes')
    type = models.CharField(max_length=10, choices=TYPE_CHOICES)
    tiers = models.CharField(max_length=150,help_text="Nom creancier ou debiteur")
    montant_total = models.DecimalField(max_digits=15, decimal_places=2)
    montant_rembourse= models.DecimalField(max_digits=15, decimal_places=2, default=0)
    echeance= models.DateField(null=True, blank=True)
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='en_cours')
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'dettes'
        ordering = ['echeance']
        verbose_name='Dette'
        
    def __str__(self):
        return f"{self.tiers} - {self.montant}FCFA restants"
    
    @property
    def montant_restant(self):
        return self.montant_total - self.montant_rembourse
    
    @property
    def pourcentage_rembourse(self):
        if self.montant_total == 0: return 0
        return round((self.montant_rembourse / self.montant_total)*100,1)
    
    ## Budget Model
    
class Budget(models.Model):
    PERIODE_CHOICES = [
        ('mensuel', 'Mensuel'),
        ('trimestriel', 'Trimestriel'),
        ('annuel', 'Annuel'),
    ]
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='budgets')
    categorie = models.ForeignKey(Categorie, on_delete=models.CASCADE, related_name='budgets')
    montant = models.DecimalField(max_digits=15, decimal_places=2, help_text="Plafond depenses")
    periode = models.CharField(max_length=15, choices=PERIODE_CHOICES)
    mois = models.PositiveSmallIntegerField(null=True, blank=True)
    annee = models.PositiveSmallIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'budgets'
        verbose_name='Budget'
        
    def __str__(self):
        return f"Budget {self.categorie.nom} - {self.montant}FCFA"
    
    ## User Model
    
class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Email obligatoire")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user
    
    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(email,password,**extra_fields)
    
class User(AbstractBaseUser, PermissionsMixin):
    email = models.EmailField(unique=True)
    nom = models.CharField(max_length=100)
    prenom = models.CharField(max_length=100, blank=True)
    entreprise = models.CharField(max_length=150, blank=True)
    telephone = models.CharField(max_length=20, blank=True)
    
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(auto_now_add=True)
    
    groups = models.ManyToManyField(
        'auth.Group',
        related_name='api_user_set',
        blank=True
    )
    
    objects = UserManager()
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS =['nom']
    
    class Meta:
        db_table = 'users'
        verbose_name = 'Utilisateur'
        
    def __str__(self):
        return f"{self.nom} <{self.email}"
    
    @property
    def full_name(self):
        return f"{self.prenom} {self.nom}".strip()




class Facture(models.Model):
    STATUT_CHOICES = [
        ('brouillon',  'Brouillon'),
        ('envoyee',    'Envoyée'),
        ('payee',      'Payée'),
        ('en_attente', 'En attente'),
        ('annulee',    'Annulée'),
    ]

    user            = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='factures')
    transaction     = models.ForeignKey('Transaction', on_delete=models.SET_NULL, null=True, blank=True, related_name='factures')

    # Numérotation automatique ex: FAC-2026-0001
    numero          = models.CharField(max_length=30, unique=True, blank=True)

    # Infos client
    client_nom      = models.CharField(max_length=150)
    client_email    = models.EmailField(blank=True)
    client_telephone= models.CharField(max_length=20, blank=True)
    client_adresse  = models.TextField(blank=True)

    # Dates
    date_emission   = models.DateField()
    date_echeance   = models.DateField(null=True, blank=True)

    # Statut
    statut          = models.CharField(max_length=20, choices=STATUT_CHOICES, default='brouillon')

    # Montants calculés automatiquement
    sous_total      = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    taux_tva        = models.DecimalField(max_digits=5, decimal_places=2, default=0, help_text="Taux TVA en %")
    montant_tva     = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    montant_total   = models.DecimalField(max_digits=15, decimal_places=2, default=0)

    notes           = models.TextField(blank=True)
    created_at      = models.DateTimeField(auto_now_add=True)
    updated_at      = models.DateTimeField(auto_now=True)

    class Meta:
        db_table  = 'factures'
        ordering  = ['-date_emission', '-created_at']
        verbose_name = 'Facture'

    def __str__(self):
        return f"{self.numero} — {self.client_nom}"

    def save(self, *args, **kwargs):
        # Numérotation automatique FAC-ANNEE-XXXX
        if not self.numero:
            from django.utils import timezone
            annee = timezone.now().year
            derniere = Facture.objects.filter(
                numero__startswith=f'FAC-{annee}-'
            ).order_by('-numero').first()
            if derniere:
                try:
                    seq = int(derniere.numero.split('-')[-1]) + 1
                except:
                    seq = 1
            else:
                seq = 1
            self.numero = f'FAC-{annee}-{seq:04d}'
        super().save(*args, **kwargs)

    # def recalculer_totaux(self):
    #     """Recalcule sous_total, TVA et total depuis les lignes"""
    #     self.sous_total   = sum(l.total for l in self.lignes.all())
    #     self.montant_tva  = round(self.sous_total * self.taux_tva / 100, 2)
    #     self.montant_total = self.sous_total + self.montant_tva
    #     self.save()
    # def recalculer_totaux(self):
    #       self.sous_total    = sum(l.total for l in self.lignes.all())
    #       self.montant_tva   = round(float(self.sous_total) * float(self.taux_tva) / 100, 2)
    #       self.montant_total = float(self.sous_total) + float(self.montant_tva)
    #       Facture.objects.filter(pk=self.pk).update(
    #       sous_total    = self.sous_total,
    #       montant_tva   = self.montant_tva,
    #       montant_total = self.montant_total,
    # )

    def recalculer_totaux(self):
        from django.db.models import Sum
        sous_total = float(self.lignes.aggregate(t=Sum('total'))['t'] or 0)
        montant_tva   = round(sous_total * float(self.taux_tva) / 100, 2)
        montant_total = round(sous_total + montant_tva, 2)
        Facture.objects.filter(pk=self.pk).update(
            sous_total    = sous_total,
            montant_tva   = montant_tva,
            montant_total = montant_total,
        )
        self.sous_total    = sous_total
        self.montant_tva   = montant_tva
        self.montant_total = montant_total


# class LigneFacture(models.Model):
#     facture     = models.ForeignKey(Facture, on_delete=models.CASCADE, related_name='lignes')
#     description = models.CharField(max_length=255)
#     quantite    = models.DecimalField(max_digits=10, decimal_places=2, default=1)
#     prix_unitaire = models.DecimalField(max_digits=15, decimal_places=2)
#     total       = models.DecimalField(max_digits=15, decimal_places=2, default=0)
#
#     class Meta:
#         db_table = 'lignes_facture'
#         verbose_name = 'Ligne de facture'
#
#     def __str__(self):
#         return f"{self.description} x{self.quantite}"
#
#     # def save(self, *args, **kwargs):
#     #     # Calcul automatique du total de la ligne
#     #     self.total = self.quantite * self.prix_unitaire
#     #     super().save(*args, **kwargs)
#     #     # Recalculer les totaux de la facture
#     #     self.facture.recalculer_totaux()
#     def save(self, *args, **kwargs):
#           self.total = round(float(self.quantite) * float(self.prix_unitaire), 2)
#           super().save(*args, **kwargs)
#           self.facture.recalculer_totaux()

class LigneFacture(models.Model):
    facture       = models.ForeignKey(Facture, on_delete=models.CASCADE, related_name='lignes')
    description   = models.CharField(max_length=255)
    quantite      = models.DecimalField(max_digits=10, decimal_places=2, default=1)
    prix_unitaire = models.DecimalField(max_digits=15, decimal_places=2)
    total         = models.DecimalField(max_digits=15, decimal_places=2, default=0)

    class Meta:
        db_table = 'lignes_facture'

    def save(self, *args, **kwargs):
        # ✅ Conversion en float pour éviter les problèmes Decimal
        self.total = round(float(self.quantite) * float(self.prix_unitaire), 2)
        super().save(*args, **kwargs)
        # ✅ Recalculer les totaux de la facture
        self.facture.recalculer_totaux()


