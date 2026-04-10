from rest_framework import serializers
from .models import Transaction, Categorie, Dette, Budget, User, Facture, LigneFacture

class CategorieSerializer(serializers.ModelSerializer):
    class Meta:
        model = Categorie
        fields = ['id', 'nom', 'type']
        read_only_fiels = ['id', 'nom', 'type']
        
        

class TransactionSerializer(serializers.ModelSerializer):
    categorie_detail = CategorieSerializer(source='categorie', read_only=True)
    class Meta:
        model = Transaction
        fields = ['id','type','description', 'categorie','categorie_detail',
                'date','statut','montant','created_at','updated_at']
        read_only_fields = ['id','created_at','updated_at']
        
    def create(self, validated_data):
        validated_data['user']=self.context['request'].user
        return super().create(validated_data)
        
class TransactionSummarySerializer(serializers.Serializer):
    total_entrees = serializers.DecimalField(max_digits=15, decimal_places=2)
    total_sorties = serializers.DecimalField(max_digits=15, decimal_places=2)
    solde = serializers.DecimalField(max_digits=15, decimal_places=2)
    nb_transactions = serializers.IntegerField()
    
    
    
class DetteSerializer(serializers.ModelSerializer):
    montant_restant = serializers.ReadOnlyField()
    pourcentage_rembourse = serializers.ReadOnlyField()
    
    class Meta:
        model = Dette
        fields = ['id','type','tiers','montant_total','montant_rembourse',
            'montant_restant','pourcentage_rembourse','echeance','statut',
            'description',
            'created_at']
        read_only_fields = ['id', 'created_at']
        
    def create(self, validated_data):
        validated_data['user']=self.context['request'].user
        return super().create(validated_data)
    
    
            
class BudgetSerializer(serializers.ModelSerializer):
    categorie_nom =serializers.CharField(source= 'categorie.nom', read_only=True)
    
    class Meta:
        model = Budget
        fields = ['id','categorie','categorie_nom','montant','periode','mois','annee','created_at']
        read_only_fields = ['id', 'created_at']
        
    def create(self, validated_data):
        validated_data['user']=self.context['request'].user
        return super().create(validated_data)
    
    
    
class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=0)
    password2 = serializers.CharField(write_only=True, label="Confirmer mot de passe")
    
    class Meta:
        model = User
        fields = ['email', 'nom', 'prenom', 'entreprise', 'telephone','password', 'password2']
        
    def validate(self, attrs):
        if attrs['password']!= attrs.pop('password2'):
            raise serializers.ValidationError({"password": ""})
        return attrs
    
    def create(self, validated_data):
        return User.objects.create_user(**validated_data)
    
class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id','email', 'nom', 'prenom', 'entreprise', 'telephone', 'date_joined']
        read_only_fields = ['id','date_joined']
        
class ChangePasswordSerializer(serializers.Serializer):
    ancien_password = serializers.CharField(write_only=True)
    nouveau_password = serializers.CharField(write_only=True, min_length=8)


class LigneFactureSerializer(serializers.ModelSerializer):
    class Meta:
        model = LigneFacture
        fields = ['id', 'description', 'quantite', 'prix_unitaire', 'total']
        read_only_fields = ['id', 'total']


class FactureSerializer(serializers.ModelSerializer):
    lignes = LigneFactureSerializer(many=True, read_only=True)

    class Meta:
        model = Facture
        fields = [
            'id', 'numero', 'client_nom', 'client_email', 'client_telephone',
            'client_adresse', 'date_emission', 'date_echeance', 'statut',
            'sous_total', 'taux_tva', 'montant_tva', 'montant_total',
            'notes', 'transaction', 'lignes', 'created_at'
        ]
        read_only_fields = ['id', 'numero', 'sous_total', 'montant_tva', 'montant_total', 'created_at']

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)
